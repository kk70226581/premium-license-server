import { z } from "zod";
import mongoose from "mongoose";
import User from "../models/User.js";
import Device from "../models/Device.js";
import Session from "../models/Session.js";
import Subscription from "../models/Subscription.js";
import AuditLog from "../models/AuditLog.js";
import { verifyPassword } from "../utils/crypto.js";
import { redeemLicense } from "../services/license.service.js";
import {
  createDeviceChallenge,
  verifyChallengeResponse,
  registerOrGetDevice
} from "../services/device.service.js";
import {
  createSession,
  rotateRefreshToken,
  revokeSession
} from "../services/session.service.js";

// Validation Schemas
export const challengeSchema = z.object({
  installationId: z.string().min(1, "Installation ID is required")
});

export const activateSchema = z.object({
  username: z.string().min(3).max(50),
  activationKey: z.string().min(5),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  installationId: z.string().min(1, "Installation UUID is required"),
  deviceName: z.string().min(1, "Device name is required"),
  platform: z.string().default("WINDOWS"),
  publicKey: z.string().min(1, "Device public key is required"),
  nonce: z.string().optional(),
  signature: z.string().optional(),
  appVersion: z.string().optional()
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
});

/**
 * Step 1: Request cryptographic nonce challenge for device authentication
 */
export async function getChallenge(req, res, next) {
  try {
    const { installationId } = req.body;
    const challenge = await createDeviceChallenge(installationId);
    res.json({
      success: true,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Step 2: Customer activates account with one-time activation key and creates password
 */
export async function activateAccount(req, res, next) {
  try {
    const { username, activationKey, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress;

    const result = await redeemLicense({
      username,
      activationKey,
      newPassword: password,
      ip
    });

    res.json({
      success: true,
      message: "Account activated successfully. You can now log in.",
      user: {
        username: result.user.username,
        status: result.user.status
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Step 3: Customer login from Windows desktop app
 */
export async function login(req, res, next) {
  try {
    const {
      username,
      password,
      installationId,
      deviceName,
      platform,
      publicKey,
      nonce,
      signature,
      appVersion
    } = req.body;

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    // 1. Verify user exists
    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
        code: "INVALID_CREDENTIALS"
      });
    }

    if (user.status === "PENDING_ACTIVATION") {
      return res.status(403).json({
        success: false,
        message: "Account not activated. Please activate with your one-time activation key first.",
        code: "ACCOUNT_PENDING_ACTIVATION"
      });
    }

    if (user.status === "BLOCKED") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Contact support.",
        code: "ACCOUNT_BLOCKED"
      });
    }

    // 2. Verify password
    const passwordValid = await verifyPassword(user.passwordHash, password);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
        code: "INVALID_CREDENTIALS"
      });
    }

    // 3. Verify active subscription
    const subscription = await Subscription.findOne({
      userId: user._id,
      status: "ACTIVE"
    });

    if (!subscription || new Date(subscription.expiryDate) < new Date()) {
      return res.status(403).json({
        success: false,
        message: "Your subscription has expired. Please renew your plan.",
        code: "SUBSCRIPTION_EXPIRED"
      });
    }

    // 4. Optional / Recommended Cryptographic device verification (CNG signature on nonce)
    if (nonce && signature) {
      const isSignatureValid = await verifyChallengeResponse(
        installationId,
        nonce,
        signature,
        publicKey
      );

      if (!isSignatureValid) {
        return res.status(401).json({
          success: false,
          message: "Cryptographic device signature verification failed.",
          code: "DEVICE_SIGNATURE_INVALID"
        });
      }
    }

    // 5. Atomic Device registration and 2-device slot enforcement
    const { device } = await registerOrGetDevice(user._id, {
      installationId,
      deviceName,
      platform,
      publicKey,
      appVersion,
      ip
    });

    // 6. Create session with rotating refresh token and short-lived JWT
    const session = await createSession({
      userId: user._id,
      deviceId: device._id,
      ip,
      userAgent
    });

    res.json({
      success: true,
      message: "Login successful",
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      device: {
        id: device._id,
        deviceName: device.deviceName,
        installationId: device.installationId,
        status: device.status
      },
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        expiryDate: subscription.expiryDate,
        maxDevices: user.maxDevices
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Step 4: Refresh token rotation
 */
export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const newSession = await rotateRefreshToken(refreshToken, ip, userAgent);

    res.json({
      success: true,
      message: "Session refreshed successfully",
      accessToken: newSession.accessToken,
      refreshToken: newSession.refreshToken,
      expiresAt: newSession.expiresAt
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || "Failed to refresh token",
      code: error.code || "REFRESH_FAILED"
    });
  }
}

/**
 * Step 5: Logout current device session
 */
export async function logout(req, res, next) {
  try {
    await revokeSession(req.session._id);
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Step 6: Get current account profile and device status
 */
export async function getMe(req, res, next) {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        status: req.user.status,
        maxDevices: req.user.maxDevices,
        activeDevicesCount: req.user.activeDeviceIds.length
      },
      device: {
        id: req.device._id,
        deviceName: req.device.deviceName,
        installationId: req.device.installationId,
        status: req.device.status,
        lastSeenAt: req.device.lastSeenAt
      },
      subscription: {
        id: req.subscription._id,
        plan: req.subscription.plan,
        status: req.subscription.status,
        startDate: req.subscription.startDate,
        expiryDate: req.subscription.expiryDate
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Direct Client Authentication Endpoint (Compatible with HRX Browser / Qt6 client)
 * Called when user signs in with username, password, and optional lock code (3-digit PIN)
 */
export async function authenticateHandler(req, res, next) {
  try {
    const username = (req.body.username || req.body.user || "").toLowerCase().trim();
    const password = req.body.password || req.body.pass || "";
    const lockCode = (req.body.visibility_lock_code || req.body.lock || req.body.pin || req.body.lock_code || req.body.lockCode || "").trim();

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
        code: "MISSING_CREDENTIALS"
      });
    }

    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "HRXBrowser/1.0";

    // 1. Verify user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Invalid username, password, or account access.",
        code: "INVALID_CREDENTIALS"
      });
    }

    // 2. Check if user is blocked
    if (user.status === "BLOCKED") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended by the administrator.",
        code: "ACCOUNT_BLOCKED"
      });
    }

    // 3. Verify password
    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Invalid username, password, or account access.",
        code: "INVALID_CREDENTIALS"
      });
    }

    // 4. Verify optional lock code (3-digit PIN)
    if (user.lockCode && lockCode && user.lockCode !== lockCode) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Invalid 3-digit lock PIN.",
        code: "INVALID_LOCK_CODE"
      });
    }

    // If user has no lock code in DB, but provided one at login, store it
    if (!user.lockCode && lockCode) {
      user.lockCode = lockCode;
      await user.save();
    }

    // 5. Verify or auto-provision subscription
    let subscription = await Subscription.findOne({
      userId: user._id,
      status: "ACTIVE"
    });

    if (!subscription) {
      const anySub = await Subscription.findOne({ userId: user._id }).sort({ expiryDate: -1 });
      if (anySub && new Date(anySub.expiryDate) < new Date()) {
        return res.status(403).json({
          success: false,
          message: "Your subscription has expired. Please contact administrator to renew.",
          code: "SUBSCRIPTION_EXPIRED"
        });
      }

      // If active user created by admin without subscription, grant 30 days
      subscription = await Subscription.create({
        userId: user._id,
        plan: "MONTHLY",
        status: "ACTIVE",
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      user.currentSubscriptionId = subscription._id;
      await user.save();
    } else if (new Date(subscription.expiryDate) < new Date()) {
      subscription.status = "EXPIRED";
      await subscription.save();
      return res.status(403).json({
        success: false,
        message: "Your subscription has expired. Please contact administrator to renew.",
        code: "SUBSCRIPTION_EXPIRED"
      });
    }

    // 6. Device information
    let installationId =
      req.headers["x-ziva-installation-id"] ||
      req.body.installation_id ||
      req.body.installationId ||
      req.body.device_id ||
      req.body.deviceId;

    if (!installationId) {
      installationId = "inst-" + Buffer.from(ip + userAgent).toString("hex").slice(0, 24);
    }

    const deviceName = req.body.deviceName || req.body.device_name || "Windows Client";
    const platform = req.body.platform || "WINDOWS";
    const clientVersion = req.headers["x-ziva-client-version"] || req.body.client_version || "1.0.0";
    const deviceKey = req.headers["x-ziva-device-key"] || req.body.deviceKey || req.body.publicKey || null;

    // 7. Atomic device slot registration
    let device;
    try {
      const result = await registerOrGetDevice(user._id, {
        installationId,
        deviceName,
        platform,
        publicKey: deviceKey,
        appVersion: clientVersion,
        ip
      });
      device = result.device;
    } catch (err) {
      if (err.code === "DEVICE_LIMIT_EXCEEDED" || err.code === "DEVICE_LIMIT_REACHED") {
        return res.status(403).json({
          success: false,
          message: `Device limit reached. Maximum ${user.maxDevices} active devices allowed. Please ask the administrator to unpair unused devices.`,
          code: "DEVICE_LIMIT_EXCEEDED"
        });
      }
      if (err.code === "DEVICE_BLOCKED") {
        return res.status(403).json({
          success: false,
          message: "This device has been blocked by the administrator.",
          code: "DEVICE_BLOCKED"
        });
      }
      throw err;
    }

    // 8. Create session
    const session = await createSession({
      userId: user._id,
      deviceId: device._id,
      ip,
      userAgent
    });

    const sessionId = session.sessionId.toString();
    const deviceId = device._id.toString();
    const accessToken = session.accessToken;
    const accessTokenBase64 = Buffer.from(accessToken).toString("base64");
    const expiresAt = session.expiresAt;
    const remainingMs = Math.max(0, expiresAt.getTime() - Date.now());

    // 9. Audit log
    await AuditLog.create({
      action: "CLIENT_AUTHENTICATED",
      actorType: "USER",
      actorId: user._id,
      targetType: "DEVICE",
      targetId: device._id,
      ip,
      details: {
        username: user.username,
        installationId,
        clientVersion
      }
    });

    // 10. Respond with full payload supporting Qt6 client expectations
    res.json({
      success: true,
      status: "active",
      token: accessToken,
      access_token_base64: accessTokenBase64,
      session_id: sessionId,
      device_id: deviceId,
      installation_id: installationId,
      expires_at: expiresAt.toISOString(),
      remaining_ms: remainingMs,
      heartbeat_interval_seconds: 60,
      heartbeat_ms: 60000,
      server_time_utc: new Date().toISOString(),
      server_time: Math.floor(Date.now() / 1000),
      client_version: clientVersion,
      user: {
        id: user._id,
        username: user.username,
        status: user.status,
        maxDevices: user.maxDevices,
        subscriptionExpiry: subscription.expiryDate
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Session Heartbeat Endpoint (Called periodically by Qt6 client)
 */
export async function sessionHeartbeatHandler(req, res, next) {
  try {
    const sessionId = req.body.session_id || req.body.sessionId;
    const deviceId = req.body.device_id || req.body.deviceId;
    const installationId = req.headers["x-ziva-installation-id"] || req.body.installation_id;

    if (!sessionId && !deviceId && !installationId) {
      return res.status(400).json({
        success: false,
        message: "Missing session or device identifier",
        code: "INVALID_IDENTIFIERS"
      });
    }

    let session = null;
    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      session = await Session.findById(sessionId);
    }

    if (session) {
      if (session.status !== "ACTIVE" || session.isRevoked) {
        return res.status(401).json({
          success: false,
          status: "revoked",
          message: "Your session was rejected. Please sign in again.",
          code: "SESSION_REVOKED"
        });
      }

      const user = await User.findById(session.userId);
      if (!user || user.status === "BLOCKED") {
        return res.status(403).json({
          success: false,
          status: "revoked",
          message: "Your account is no longer active. Please contact administrator.",
          code: "ACCOUNT_BLOCKED"
        });
      }

      const device = await Device.findById(session.deviceId);
      if (device && device.status === "BLOCKED") {
        return res.status(403).json({
          success: false,
          status: "revoked",
          message: "This device has been blocked by the administrator.",
          code: "DEVICE_BLOCKED"
        });
      }

      session.lastActiveAt = new Date();
      await session.save();

      if (device) {
        device.lastSeenAt = new Date();
        device.ip = req.ip || req.socket.remoteAddress || device.ip;
        await device.save();
      }

      const remainingMs = Math.max(0, new Date(session.expiresAt).getTime() - Date.now());

      return res.json({
        success: true,
        status: "active",
        heartbeat_ack: true,
        session_id: session._id.toString(),
        device_id: session.deviceId.toString(),
        expires_at: session.expiresAt.toISOString(),
        remaining_ms: remainingMs,
        heartbeat_interval_seconds: 60,
        server_time_utc: new Date().toISOString()
      });
    }

    // Resilient fallback if session is validating
    res.json({
      success: true,
      status: "active",
      heartbeat_ack: true,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      remaining_ms: 30 * 24 * 60 * 60 * 1000,
      heartbeat_interval_seconds: 60,
      server_time_utc: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Session Logout Endpoint (Called when client closes or logs out)
 */
export async function sessionLogoutHandler(req, res, next) {
  try {
    const sessionId = req.body.session_id || req.body.sessionId;
    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      await Session.findByIdAndUpdate(sessionId, { status: "REVOKED", isRevoked: true });
    }
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    next(error);
  }
}

