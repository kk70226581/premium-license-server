import { verifyAccessToken } from "../utils/token.js";
import Session from "../models/Session.js";
import User from "../models/User.js";
import Device from "../models/Device.js";
import Subscription from "../models/Subscription.js";

/**
 * Customer authentication middleware:
 * Validates JWT access token AND checks database state for immediate revocation enforcement
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED"
      });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        code: "TOKEN_EXPIRED"
      });
    }

    const { sessionId, userId, deviceId } = decoded;

    // Verify session state in database for immediate remote logout support
    const session = await Session.findById(sessionId);
    if (!session || session.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        message: "Session has been revoked or expired. Please log in again.",
        code: "SESSION_REVOKED"
      });
    }

    // Verify device status
    const device = await Device.findById(deviceId);
    if (!device || device.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "This device has been blocked by administrator.",
        code: "DEVICE_BLOCKED"
      });
    }

    // Verify user status
    const user = await User.findById(userId);
    if (!user || user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User account is suspended or blocked.",
        code: "ACCOUNT_SUSPENDED"
      });
    }

    // Verify active subscription
    const subscription = await Subscription.findOne({
      userId,
      status: "ACTIVE"
    });
    if (!subscription || new Date(subscription.expiryDate) < new Date()) {
      return res.status(403).json({
        success: false,
        message: "Subscription has expired. Please renew your subscription.",
        code: "SUBSCRIPTION_EXPIRED"
      });
    }

    // Attach verified entities to request
    req.user = user;
    req.device = device;
    req.session = session;
    req.subscription = subscription;

    next();
  } catch (error) {
    console.error("[Auth Middleware Error]:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication check",
      code: "SERVER_ERROR"
    });
  }
}

