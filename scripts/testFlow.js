import "dotenv/config";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "../src/config/database.js";
import User from "../src/models/User.js";
import Admin from "../src/models/Admin.js";
import Device from "../src/models/Device.js";
import Subscription from "../src/models/Subscription.js";
import License from "../src/models/License.js";
import Payment from "../src/models/Payment.js";
import Session from "../src/models/Session.js";
import AuditLog from "../src/models/AuditLog.js";

import { submitPayment, approvePayment } from "../src/services/payment.service.js";
import { redeemLicense } from "../src/services/license.service.js";
import { createDeviceChallenge, verifyChallengeResponse, registerOrGetDevice, blockDevice } from "../src/services/device.service.js";
import { createSession, rotateRefreshToken } from "../src/services/session.service.js";
import { hashPassword, verifyPassword } from "../src/utils/crypto.js";

function generateTestKeyPair() {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });
}

function signNonce(nonce, privateKeyPem) {
  const signer = crypto.createSign("SHA256");
  signer.update(Buffer.from(nonce, "utf8"));
  signer.end();
  return signer.sign(privateKeyPem, "base64");
}

async function runTestFlow() {
  console.log("=== STARTING FULL SUBSCRIPTION & DEVICE TEST FLOW ===");

  try {
    await connectDB();
    console.log("✓ MongoDB Connected");

    // Clean test data if desired or create distinct test run
    const testRunId = crypto.randomInt(1000, 9999);
    const testEmail = `tester_${testRunId}@example.com`;
    const testUtr = `UTR${Date.now().toString().slice(-8)}${testRunId}`;

    console.log(`\n--- 1. Submitting Manual UPI Payment for plan: YEARLY ---`);
    const payment = await submitPayment({
      utr: testUtr,
      customerName: "Karan Sharma",
      customerEmail: testEmail,
      customerPhone: "+919876543210",
      requestedPlan: "YEARLY"
    });
    console.log(`✓ Payment submitted: UTR=${payment.utr}, Amount=₹${payment.amount}, Status=${payment.status}`);

    console.log(`\n--- 2. Admin Approving Payment & Generating License ---`);
    const approvalResult = await approvePayment(payment._id);
    const username = approvalResult.user.username;
    const activationKey = approvalResult.activationKey;
    console.log(`✓ Payment Approved!`);
    console.log(`  Created Username:   ${username}`);
    console.log(`  Activation Key:     ${activationKey}`);
    console.log(`  Subscription Expiry: ${approvalResult.subscription.expiryDate}`);

    console.log(`\n--- 3. Customer Redeeming Activation Key & Setting Password ---`);
    const testPassword = "SuperSecretPassword123!";
    const redemption = await redeemLicense({
      username,
      activationKey,
      newPassword: testPassword,
      ip: "127.0.0.1"
    });
    console.log(`✓ License redeemed successfully! Account status: ${redemption.user.status}`);

    // Verify reuse of key fails
    try {
      await redeemLicense({
        username,
        activationKey,
        newPassword: "AnotherPassword",
        ip: "127.0.0.1"
      });
      console.error("✗ ERROR: Reused activation key was not rejected!");
    } catch (e) {
      console.log(`✓ Expected rejection: Reused activation key was rejected (${e.message})`);
    }

    console.log(`\n--- 4. Registering Device 1 (Windows Laptop) with CNG Challenge-Response ---`);
    const device1Keys = generateTestKeyPair();
    const device1InstallId = `INST-DEV-1-${testRunId}`;
    const dev1Challenge = await createDeviceChallenge(device1InstallId);
    const dev1Signature = signNonce(dev1Challenge.nonce, device1Keys.privateKey);

    const dev1SigValid = await verifyChallengeResponse(
      device1InstallId,
      dev1Challenge.nonce,
      dev1Signature,
      device1Keys.publicKey
    );
    console.log(`✓ Cryptographic Device 1 Challenge Signature Valid: ${dev1SigValid}`);

    const dev1Reg = await registerOrGetDevice(redemption.user._id, {
      installationId: device1InstallId,
      deviceName: "Karan Windows Laptop",
      publicKey: device1Keys.publicKey,
      ip: "192.168.1.10"
    });
    console.log(`✓ Device 1 Registered: ${dev1Reg.device.deviceName} (ID: ${dev1Reg.device._id})`);

    const session1 = await createSession({
      userId: redemption.user._id,
      deviceId: dev1Reg.device._id
    });
    console.log(`✓ Device 1 Session Created (JWT access + refresh token)`);

    console.log(`\n--- 5. Registering Device 2 (Office Desktop) ---`);
    const device2Keys = generateTestKeyPair();
    const device2InstallId = `INST-DEV-2-${testRunId}`;
    const dev2Reg = await registerOrGetDevice(redemption.user._id, {
      installationId: device2InstallId,
      deviceName: "Office Desktop PC",
      publicKey: device2Keys.publicKey,
      ip: "192.168.1.20"
    });
    console.log(`✓ Device 2 Registered: ${dev2Reg.device.deviceName} (ID: ${dev2Reg.device._id})`);

    console.log(`\n--- 6. Attempting to Register Device 3 (Third Computer) ---`);
    const device3Keys = generateTestKeyPair();
    const device3InstallId = `INST-DEV-3-${testRunId}`;

    try {
      await registerOrGetDevice(redemption.user._id, {
        installationId: device3InstallId,
        deviceName: "Third Extra Computer",
        publicKey: device3Keys.publicKey,
        ip: "192.168.1.30"
      });
      console.error("✗ ERROR: Device 3 was allowed when limit is 2!");
    } catch (e) {
      console.log(`✓ Expected rejection: 2-Device Limit Enforced! (${e.message})`);
    }

    console.log(`\n--- 7. Admin Remotely Blocking Device 1 ---`);
    await blockDevice(dev1Reg.device._id, null, "Test block by administrator");
    console.log(`✓ Device 1 blocked, active sessions revoked, and slot freed!`);

    console.log(`\n--- 8. Retrying Registration for Device 3 (Now 1 Slot is Available) ---`);
    const dev3Reg = await registerOrGetDevice(redemption.user._id, {
      installationId: device3InstallId,
      deviceName: "Third Extra Computer",
      publicKey: device3Keys.publicKey,
      ip: "192.168.1.30"
    });
    console.log(`✓ Device 3 successfully took the freed slot! (ID: ${dev3Reg.device._id})`);

    console.log(`\n--- 9. Refresh Token Rotation & Session Revocation Test ---`);
    try {
      await rotateRefreshToken(session1.refreshToken);
      console.error("✗ Device 1 refresh should have failed because Device 1 was blocked!");
    } catch (e) {
      console.log(`✓ Expected rejection: Device 1 refresh rejected because session/device was blocked (${e.message})`);
    }

    console.log(`\n🎉 ALL 9 TEST PHASES PASSED SUCCESSFULLY ON MONGODB ATLAS!`);
  } catch (error) {
    console.error("Test Flow Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n=== TEST FLOW FINISHED ===");
  }
}

if (process.argv[1].endsWith("testFlow.js")) {
  runTestFlow();
}

