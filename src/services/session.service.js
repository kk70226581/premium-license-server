import mongoose from "mongoose";
import Session from "../models/Session.js";
import User from "../models/User.js";
import Device from "../models/Device.js";
import Subscription from "../models/Subscription.js";
import { generateRandomToken, hashSha256 } from "../utils/crypto.js";
import { generateAccessToken } from "../utils/token.js";

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

/**
 * Create a new user session with rotating refresh token and access token
 */
export async function createSession({ userId, deviceId, ip = null, userAgent = null }) {
  const refreshToken = generateRandomToken(32);
  const refreshTokenHash = hashSha256(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const session = await Session.create({
    userId,
    deviceId,
    refreshTokenHash,
    status: "ACTIVE",
    expiresAt,
    ip,
    userAgent
  });

  const accessToken = generateAccessToken({
    sessionId: session._id,
    userId,
    deviceId
  });

  return {
    sessionId: session._id,
    accessToken,
    refreshToken,
    expiresAt
  };
}

/**
 * Rotate refresh token: invalidates old token, verifies user & device status, issues new pair
 */
export async function rotateRefreshToken(oldRefreshToken, ip = null, userAgent = null) {
  if (!oldRefreshToken) {
    throw new Error("Missing refresh token");
  }

  const oldTokenHash = hashSha256(oldRefreshToken);
  const session = await Session.findOne({ refreshTokenHash: oldTokenHash });

  if (!session || session.status !== "ACTIVE") {
    throw new Error("INVALID_OR_REVOKED_SESSION");
  }

  if (new Date(session.expiresAt) < new Date()) {
    session.status = "EXPIRED";
    await session.save();
    throw new Error("SESSION_EXPIRED");
  }

  // Verify device is still ACTIVE
  const device = await Device.findById(session.deviceId);
  if (!device || device.status !== "ACTIVE") {
    session.status = "REVOKED";
    await session.save();
    throw new Error("DEVICE_BLOCKED_OR_REMOVED");
  }

  // Verify user is still ACTIVE
  const user = await User.findById(session.userId);
  if (!user || user.status !== "ACTIVE") {
    session.status = "REVOKED";
    await session.save();
    throw new Error("USER_BLOCKED_OR_INACTIVE");
  }

  // Verify subscription is still active
  const subscription = await Subscription.findOne({
    userId: session.userId,
    status: "ACTIVE"
  });
  if (!subscription || new Date(subscription.expiryDate) < new Date()) {
    throw new Error("SUBSCRIPTION_EXPIRED");
  }

  // Invalidate old session
  session.status = "REVOKED";
  await session.save();

  // Create new session
  return await createSession({
    userId: session.userId,
    deviceId: session.deviceId,
    ip,
    userAgent
  });
}

/**
 * Revoke specific session (logout)
 */
export async function revokeSession(sessionId) {
  return await Session.findByIdAndUpdate(sessionId, { status: "REVOKED" });
}

/**
 * Revoke all sessions for a specific device
 */
export async function revokeDeviceSessions(deviceId) {
  return await Session.updateMany(
    { deviceId, status: "ACTIVE" },
    { status: "REVOKED" }
  );
}

/**
 * Revoke all sessions for a user (remote logout all)
 */
export async function revokeAllUserSessions(userId) {
  return await Session.updateMany(
    { userId, status: "ACTIVE" },
    { status: "REVOKED" }
  );
}

