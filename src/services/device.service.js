import mongoose from "mongoose";
import Device from "../models/Device.js";
import User from "../models/User.js";
import Challenge from "../models/Challenge.js";
import AuditLog from "../models/AuditLog.js";
import { revokeDeviceSessions } from "./session.service.js";
import { generateRandomToken, verifyDeviceSignature } from "../utils/crypto.js";
import { lookupIpLocation } from "../utils/geoip.js";

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
 * Atomic Device Slot Allocation & Registration
 * Supports MongoDB Atlas replica set transactions with standalone fallback
 */
export async function registerOrGetDevice(userId, { installationId, deviceName, platform = "WINDOWS", publicKey, appVersion, ip }) {
  // First check if this installation is already registered for this user
  const existing = await Device.findOne({ userId, installationId });
  if (existing) {
    // Only explicitly BLOCKED devices are rejected
    if (existing.status === "BLOCKED") {
      const err = new Error("This device has been blocked by the administrator.");
      err.code = "DEVICE_BLOCKED";
      throw err;
    }

    // Geolocation lookup if missing or IP changed
    if (ip && (!existing.location || !existing.location.city || existing.lastIp !== ip)) {
      try {
        const geo = await lookupIpLocation(ip);
        if (geo && geo.city) existing.location = geo;
      } catch {}
    }

    // If device was previously UNPAIRED or REVOKED, re-activate using available slot
    const user = await User.findById(userId);
    const hasSlot = user && user.activeDeviceIds.some((dId) => dId.toString() === existing._id.toString());

    if (!hasSlot || existing.status !== "ACTIVE") {
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: userId,
          $expr: { $lt: [{ $size: "$activeDeviceIds" }, "$maxDevices"] }
        },
        { $addToSet: { activeDeviceIds: existing._id } },
        { returnDocument: "after" }
      );

      if (!updatedUser) {
        const max = user ? user.maxDevices : 2;
        const currentCount = user && user.activeDeviceIds ? user.activeDeviceIds.length : max;
        const err = new Error(
          `Device limit reached (${currentCount}/${max} active devices). Please unpair an unused device in the Admin Dashboard to free a slot.`
        );
        err.code = "DEVICE_LIMIT_EXCEEDED";
        throw err;
      }
      existing.status = "ACTIVE";
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

  // Lookup IP location for new device
  let location = { city: "", region: "", country: "", isp: "" };
  if (ip) {
    try {
      location = await lookupIpLocation(ip);
    } catch {}
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
          const err = new Error("Account device limit reached. Maximum active devices in use. Please unpair an existing device.");
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
              location,
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
      const err = new Error("Account device limit reached. Maximum active devices in use. Please unpair an existing device.");
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
        location,
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
    details: { installationId, deviceName, platform, location },
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

  // Attempt to allocate slot if available
  const user = await User.findOneAndUpdate(
    {
      _id: device.userId,
      activeDeviceIds: { $ne: device._id },
      $expr: { $lt: [{ $size: "$activeDeviceIds" }, "$maxDevices"] }
    },
    { $addToSet: { activeDeviceIds: device._id } },
    { returnDocument: "after" }
  );

  // If slot available, make it ACTIVE, else UNPAIRED (ban lifted, ready when slot opens)
  device.status = user ? "ACTIVE" : "UNPAIRED";
  await device.save();

  await AuditLog.create({
    action: "DEVICE_UNBLOCKED",
    actorType: adminId ? "ADMIN" : "SYSTEM",
    actorId: adminId,
    targetType: "DEVICE",
    targetId: device._id,
    details: { userId: device.userId, status: device.status }
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

