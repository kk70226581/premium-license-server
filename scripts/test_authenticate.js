import { connectDB } from "../src/config/database.js";
import User from "../src/models/User.js";
import Device from "../src/models/Device.js";
import Session from "../src/models/Session.js";
import Subscription from "../src/models/Subscription.js";
import Admin from "../src/models/Admin.js";
import app from "../src/server.js";
import http from "http";

async function runTest() {
  console.log("=== Testing HRX Client Authentication & Admin User Management ===");
  await connectDB();

  const server = http.createServer(app);
  await new Promise((res) => server.listen(8099, res));
  const baseUrl = "http://localhost:8099";

  try {
    // 1. Get or create admin token
    let admin = await Admin.findOne({ username: "admin" });
    const adminLoginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernameOrEmail: "admin", password: "Admin@123456" })
    });
    const adminData = await adminLoginRes.json();
    if (!adminData.success) throw new Error("Admin login failed: " + JSON.stringify(adminData));
    const adminToken = adminData.token;
    console.log("✅ Admin logged in successfully");

    // Clean up any previous test user
    const existingTestUser = await User.findOne({ username: "hrx_test_client" });
    if (existingTestUser) {
      await User.findByIdAndDelete(existingTestUser._id);
      await Device.deleteMany({ userId: existingTestUser._id });
      await Session.deleteMany({ userId: existingTestUser._id });
      await Subscription.deleteMany({ userId: existingTestUser._id });
    }

    // 2. Admin creates a user with custom credentials and lock PIN
    console.log("\n--- 1. Admin creates user ---");
    const createRes = await fetch(`${baseUrl}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        username: "hrx_test_client",
        password: "ClientPass@123",
        lockCode: "786",
        plan: "MONTHLY",
        durationDays: 30,
        maxDevices: 2,
        notes: "Test customer"
      })
    });
    const createData = await createRes.json();
    console.log("Create user response:", createData);
    if (!createData.success) throw new Error("Create user failed");
    const testUserId = createData.user.id;
    console.log("✅ User created with lockCode 786 and password ClientPass@123");

    // 3. Client Authenticates to /api/authenticate
    console.log("\n--- 2. Client logs in via /api/authenticate ---");
    const authRes = await fetch(`${baseUrl}/api/authenticate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ziva-installation-id": "inst-mac-device-01",
        "x-ziva-client-version": "2.0.6"
      },
      body: JSON.stringify({
        username: "hrx_test_client",
        password: "ClientPass@123",
        visibility_lock_code: "786"
      })
    });
    const authData = await authRes.json();
    console.log("Auth response keys:", Object.keys(authData));
    console.log("Auth status:", authData.status, "session_id:", authData.session_id);
    if (!authData.success || !authData.access_token_base64 || !authData.session_id) {
      throw new Error("Client authenticate failed or missing keys: " + JSON.stringify(authData));
    }
    console.log("✅ /api/authenticate returned all required keys for Qt6 client!");

    // 4. Test heartbeat
    console.log("\n--- 3. Client sends session heartbeat ---");
    const hbRes = await fetch(`${baseUrl}/api/auth/session/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: authData.session_id,
        device_id: authData.device_id
      })
    });
    const hbData = await hbRes.json();
    console.log("Heartbeat response:", hbData);
    if (!hbData.success || !hbData.heartbeat_ack) throw new Error("Heartbeat failed");
    console.log("✅ /api/auth/session/heartbeat acknowledged!");

    // 5. Admin modifies user (Change password to NewPass@456, lockCode to 999)
    console.log("\n--- 4. Admin modifies user credentials ---");
    const patchRes = await fetch(`${baseUrl}/api/admin/users/${testUserId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        username: "hrx_test_client",
        password: "NewPass@456",
        lockCode: "999"
      })
    });
    const patchData = await patchRes.json();
    console.log("Patch response:", patchData);
    if (!patchData.success) throw new Error("Update user failed");
    console.log("✅ Admin successfully modified password & lock PIN!");

    // 6. Verify old password fails
    console.log("\n--- 5. Verify old password fails ---");
    const oldAuthRes = await fetch(`${baseUrl}/api/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "hrx_test_client",
        password: "ClientPass@123",
        visibility_lock_code: "786"
      })
    });
    console.log("Old password status:", oldAuthRes.status);
    if (oldAuthRes.status !== 401) throw new Error("Old password should have been rejected!");
    console.log("✅ Old password correctly rejected (401)");

    // 7. Verify new password succeeds
    console.log("\n--- 6. Verify new password succeeds ---");
    const newAuthRes = await fetch(`${baseUrl}/api/authenticate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ziva-installation-id": "inst-mac-device-01"
      },
      body: JSON.stringify({
        username: "hrx_test_client",
        password: "NewPass@456",
        visibility_lock_code: "999"
      })
    });
    const newAuthData = await newAuthRes.json();
    if (!newAuthData.success) throw new Error("New password failed: " + JSON.stringify(newAuthData));
    console.log("✅ New password & lock PIN authenticated successfully!");

    // 8. Clean up test user
    await fetch(`${baseUrl}/api/admin/users/${testUserId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("✅ Cleaned up test user");

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
  } finally {
    server.close();
    process.exit(0);
  }
}

runTest().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
