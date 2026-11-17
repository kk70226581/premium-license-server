import { z } from "zod";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
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

