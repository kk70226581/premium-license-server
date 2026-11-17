import License from "../models/License.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { generateActivationKey, hashSha256, hashPassword } from "../utils/crypto.js";

/**
 * Generate a new one-time activation license key for a user
 */
export async function generateLicense(userId) {
  const plainKey = generateActivationKey();
  const keyHash = hashSha256(plainKey);
  const keyPrefix = plainKey.substring(0, 8) + "...";

  const license = await License.create({
    userId,
    keyHash,
    keyPrefix,
    status: "GENERATED"
  });

  return {
    license,
    plainActivationKey: plainKey
  };
}

/**
 * Redeem an activation key to initialize account password and activate user
 */
export async function redeemLicense({ username, activationKey, newPassword, ip = null }) {
  const user = await User.findOne({ username: username.toLowerCase().trim() });
  if (!user) {
    const err = new Error("Account not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  if (user.status === "BLOCKED") {
    const err = new Error("Account is blocked. Contact support.");
    err.code = "ACCOUNT_BLOCKED";
    throw err;
  }

  const keyHash = hashSha256(activationKey.trim());
  const license = await License.findOne({ userId: user._id, keyHash });

  if (!license) {
    const err = new Error("Invalid activation key for this account");
    err.code = "INVALID_KEY";
    throw err;
  }

  if (license.status === "REDEEMED") {
    const err = new Error("This activation key has already been used");
    err.code = "KEY_ALREADY_USED";
    throw err;
  }

  if (license.status === "REVOKED") {
    const err = new Error("This activation key has been revoked");
    err.code = "KEY_REVOKED";
    throw err;
  }

  // Hash the new password with Argon2id
  const passwordHash = await hashPassword(newPassword);

  // Update user
  user.passwordHash = passwordHash;
  user.status = "ACTIVE";
  await user.save();

  // Mark license as redeemed
  license.status = "REDEEMED";
  license.redeemedAt = new Date();
  license.redeemedByIp = ip;
  await license.save();

  // Log audit
  await AuditLog.create({
    action: "LICENSE_REDEEMED",
    actorType: "USER",
    actorId: user._id,
    targetType: "LICENSE",
    targetId: license._id,
    details: { username: user.username, keyPrefix: license.keyPrefix },
    ip
  });

  return { user, license };
}

