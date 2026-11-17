import { verifyAccessToken } from "../utils/token.js";
import Admin from "../models/Admin.js";

/**
 * Admin authentication middleware:
 * Validates JWT access token and verifies admin account exists and is active
 */
export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
        code: "UNAUTHORIZED"
      });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired admin session token",
        code: "TOKEN_EXPIRED"
      });
    }

    if (decoded.role !== "ADMIN" && decoded.role !== "SUPERADMIN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin privileges required",
        code: "FORBIDDEN"
      });
    }

    const admin = await Admin.findById(decoded.adminId);
    if (!admin || !admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is deactivated or not found",
        code: "ADMIN_INACTIVE"
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("[Admin Middleware Error]:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during admin authentication check",
      code: "SERVER_ERROR"
    });
  }
}

