import mongoose from "mongoose";
import Device from "../models/Device.js";
import User from "../models/User.js";
import Challenge from "../models/Challenge.js";
import AuditLog from "../models/AuditLog.js";
import { revokeDeviceSessions } from "./session.service.js";
import { generateRandomToken, verifyDeviceSignature } from "../utils/crypto.js";

/**
 * Create a fresh cryptographic authentication challenge for a Windows installation
 */
export async function createDeviceChallenge(installationId) {
  const nonce = generateRandomToken(32);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL

  await Challenge.create({
    installationId,
    nonce,
    expiresAt,
    used: false
  });

  return { nonce, expiresAt };
}

/**
 * Verify signed challenge from Windows CNG key
 */
export async function verifyChallengeResponse(installationId, nonce, signatureBase64, publicKey) {
  const challenge = await Challenge.findOne({
    installationId,
    nonce,
    used: false
  });

  if (!challenge || new Date(challenge.expiresAt) < new Date()) {
    return false;
  }

  // Mark challenge used immediately to prevent replay attacks
  challenge.used = true;
  await challenge.save();

  return verifyDeviceSignature(publicKey, nonce, signatureBase64);
}

/**
 * Atomic 2-Device Slot Allocation & Registration
 * Supports MongoDB Atlas replica set transactions with standalone fallback
 */
export async function registerOrGetDevice(userId, { installationId, deviceName, platform = "WINDOWS", publicKey, appVersion, ip }) {
  // First check if this installation is already registered for this user
  const existing = await Device.findOne({ userId, installationId });
  if (existing) {
    if (existing.status !== "ACTIVE") {
      const err = new Error("Device is blocked on this account. Contact support.");
      err.code = "DEVICE_BLOCKED";
      throw err;
    }

    // Update heartbeat metadata and key if changed
    existing.deviceName = deviceName || existing.deviceName;
    if (publicKey) existing.publicKey = publicKey;
    existing.lastSeenAt = new Date();
    if (ip) existing.lastIp = ip;
    if (appVersion) existing.appVersion = appVersion;
    await existing.save();

    return { device: existing, isNew: false };
  }

  // New device registration requires slot allocation
  const deviceId = new mongoose.Types.ObjectId();

  // Try using MongoDB transaction if replica set is available
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (e) {
    session = null;
  }

  let registeredDevice = null;

  if (session && session.client && session.client.topology && session.client.topology.description.type !== "Single") {
    // Atlas or Replica Set: Full ACID Transaction
    try {
      await session.withTransaction(async () => {
        const user = await User.findOneAndUpdate(
          {
            _id: userId,
            activeDeviceIds: { $ne: deviceId },
            $expr: { $lt: [{ $size: "$activeDeviceIds" }, "$maxDevices"] }
          },
          { $addToSet: { activeDeviceIds: deviceId } },
          { returnDocument: "after", session }
        );

        if (!user) {
          const err = new Error("Account device limit reached (Maximum 2 active devices). Please unregister an existing device.");
          err.code = "DEVICE_LIMIT_REACHED";
          throw err;
        }

        const [device] = await Device.create(
          [
            {
              _id: deviceId,
              userId,
              installationId,
              deviceName,
              platform,
              publicKey,
              appVersion: appVersion || "1.0.0",
              lastIp: ip,
              status: "ACTIVE",
              lastSeenAt: new Date()
            }
          ],
          { session }
        );

        registeredDevice = device;
      });
    } finally {
      await session.endSession();
    }
  } else {
    // Standalone fallback: Atomic conditional query and rollback on fail
    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        activeDeviceIds: { $ne: deviceId },
        $expr: { $lt: [{ $size: "$activeDeviceIds" }, "$maxDevices"] }
      },
      { $addToSet: { activeDeviceIds: deviceId } },
      { returnDocument: "after" }
    );

    if (!user) {
      const err = new Error("Account device limit reached (Maximum 2 active devices). Please unregister an existing device.");
      err.code = "DEVICE_LIMIT_REACHED";
      throw err;
    }

    try {
      registeredDevice = await Device.create({
        _id: deviceId,
        userId,
        installationId,
        deviceName,
        platform,
        publicKey,
        appVersion: appVersion || "1.0.0",
        lastIp: ip,
        status: "ACTIVE",
        lastSeenAt: new Date()
      });
    } catch (createError) {
      // Rollback slot if device creation failed
      await User.findByIdAndUpdate(userId, {
        $pull: { activeDeviceIds: deviceId }
      });
      throw createError;
    }
  }

  // Audit log
  await AuditLog.create({
    action: "DEVICE_REGISTERED",
    actorType: "USER",
    actorId: userId,
    targetType: "DEVICE",
    targetId: deviceId,
    details: { installationId, deviceName, platform },
    ip
  });

  return { device: registeredDevice, isNew: true };
}

/**
 * Block a specific device: frees the active slot, revokes sessions
 */
export async function blockDevice(deviceId, adminId = null, reason = "Administrator blocked device") {
  const device = await Device.findById(deviceId);
  if (!device) {
    throw new Error("Device not found");
  }

  device.status = "BLOCKED";
  await device.save();

  // Atomically free up the device slot for the user
  await User.findByIdAndUpdate(device.userId, {
    $pull: { activeDeviceIds: device._id }
  });

  // Revoke all active sessions on this device
  await revokeDeviceSessions(device._id);

  // Audit Log
  await AuditLog.create({
    action: "DEVICE_BLOCKED",
    actorType: adminId ? "ADMIN" : "SYSTEM",
    actorId: adminId,
    targetType: "DEVICE",
    targetId: device._id,
    details: { reason, userId: device.userId, installationId: device.installationId }
  });

  return device;
}

/**
 * Unblock a previously blocked device
 */
export async function unblockDevice(deviceId, adminId = null) {
  const device = await Device.findById(deviceId);
  if (!device) {
    throw new Error("Device not found");
  }

  if (device.status === "ACTIVE") {
    return device;
  }

  // Check if user has an available device slot
  const user = await User.findOneAndUpdate(
    {
      _id: device.userId,
      activeDeviceIds: { $ne: device._id },
      $expr: { $lt: [{ $size: "$activeDeviceIds" }, "$maxDevices"] }
    },
    { $addToSet: { activeDeviceIds: device._id } },
    { returnDocument: "after" }
  );

  if (!user) {
    const err = new Error("Cannot unblock: user already has maximum active devices registered (2). Block another device first.");
    err.code = "DEVICE_LIMIT_REACHED";
    throw err;
  }

  device.status = "ACTIVE";
  await device.save();

  await AuditLog.create({
    action: "DEVICE_UNBLOCKED",
    actorType: adminId ? "ADMIN" : "SYSTEM",
    actorId: adminId,
    targetType: "DEVICE",
    targetId: device._id,
    details: { userId: device.userId }
  });

  return device;
}

/**
 * Update device heartbeat and activity timestamp
 */
export async function updateDeviceHeartbeat(deviceId, ip = null, appVersion = null) {
  const updateData = { lastSeenAt: new Date() };
  if (ip) updateData.lastIp = ip;
  if (appVersion) updateData.appVersion = appVersion;

  return await Device.findByIdAndUpdate(deviceId, updateData, { returnDocument: "after" });
}

