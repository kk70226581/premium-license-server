import { z } from "zod";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Device from "../models/Device.js";
import Subscription from "../models/Subscription.js";
import Payment from "../models/Payment.js";
import License from "../models/License.js";
import AuditLog from "../models/AuditLog.js";
import { hashPassword, verifyPassword } from "../utils/crypto.js";
import { generateAccessToken } from "../utils/token.js";
import { approvePayment, rejectPayment } from "../services/payment.service.js";
import { blockDevice, unblockDevice } from "../services/device.service.js";
import { revokeAllUserSessions, revokeDeviceSessions } from "../services/session.service.js";

// Validation Schemas
export const adminLoginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required")
});

export const adminSetupSchema = z.object({
  setupSecret: z.string().min(1, "Setup secret is required"),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const blockReasonSchema = z.object({
  reason: z.string().optional()
});

/**
 * Bootstrap Superadmin (one-time or with setup secret)
 */
export async function setupSuperadmin(req, res, next) {
  try {
    const { setupSecret, username, email, password } = req.body;

    if (!process.env.ADMIN_SETUP_SECRET || setupSecret !== process.env.ADMIN_SETUP_SECRET) {
      return res.status(403).json({
        success: false,
        message: "Invalid setup secret",
        code: "FORBIDDEN"
      });
    }

    const existingCount = await Admin.countDocuments();
    if (existingCount > 0) {
      const existingUser = await Admin.findOne({
        $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Admin with this username or email already exists"
        });
      }
    }

    const passwordHash = await hashPassword(password);
    const admin = await Admin.create({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "SUPERADMIN",
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: "Superadmin account created successfully",
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin Login
 */
export async function adminLogin(req, res, next) {
  try {
    const { usernameOrEmail, password } = req.body;
    const identifier = usernameOrEmail.toLowerCase().trim();

    const admin = await Admin.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid administrator credentials",
        code: "INVALID_CREDENTIALS"
      });
    }

    const validPassword = await verifyPassword(admin.passwordHash, password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid administrator credentials",
        code: "INVALID_CREDENTIALS"
      });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = generateAccessToken({
      adminId: admin._id,
      username: admin.username,
      role: admin.role
    });

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin Dashboard Overview Metrics
 */
export async function getDashboardOverview(req, res, next) {
  try {
    const now = new Date();

    const [
      totalUsers,
      activeSubscriptions,
      activeDevices,
      blockedDevices,
      pendingPayments
    ] = await Promise.all([
      User.countDocuments(),
      Subscription.countDocuments({ status: "ACTIVE", expiryDate: { $gt: now } }),
      Device.countDocuments({ status: "ACTIVE" }),
      Device.countDocuments({ status: "BLOCKED" }),
      Payment.countDocuments({ status: "PENDING" })
    ]);

    res.json({
      success: true,
      overview: {
        totalUsers,
        activeSubscriptions,
        activeDevices,
        blockedDevices,
        pendingPayments
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all users with devices and active subscription
 */
export async function getUsers(req, res, next) {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { "metadata.email": { $regex: search, $options: "i" } }
      ];
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .populate("currentSubscriptionId")
        .populate("activeDeviceIds", "deviceName status platform lastSeenAt installationId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single user detailed view
 */
export async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .populate("currentSubscriptionId");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const [devices, subscriptions, licenses] = await Promise.all([
      Device.find({ userId: user._id }).sort({ createdAt: -1 }),
      Subscription.find({ userId: user._id }).sort({ createdAt: -1 }),
      License.find({ userId: user._id }).select("-keyHash").sort({ createdAt: -1 })
    ]);

    res.json({
      success: true,
      user,
      devices,
      subscriptions,
      licenses
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Block customer account
 */
export async function blockUser(req, res, next) {
  try {
    const { id } = req.params;
    const { reason = "Blocked by administrator" } = req.body || {};

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.status = "BLOCKED";
    await user.save();

    // Revoke all customer sessions immediately
    await revokeAllUserSessions(user._id);

    await AuditLog.create({
      action: "USER_BLOCKED",
      actorType: "ADMIN",
      actorId: req.admin._id,
      targetType: "USER",
      targetId: user._id,
      details: { reason, username: user.username }
    });

    res.json({
      success: true,
      message: `User ${user.username} blocked and all sessions revoked`,
      user
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unblock customer account
 */
export async function unblockUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.status = "ACTIVE";
    await user.save();

    await AuditLog.create({
      action: "USER_UNBLOCKED",
      actorType: "ADMIN",
      actorId: req.admin._id,
      targetType: "USER",
      targetId: user._id,
      details: { username: user.username }
    });

    res.json({
      success: true,
      message: `User ${user.username} unblocked successfully`,
      user
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Revoke all active sessions for a user (Remote logout all devices)
 */
export async function revokeUserSessions(req, res, next) {
  try {
    const { id } = req.params;
    const result = await revokeAllUserSessions(id);

    await AuditLog.create({
      action: "USER_SESSIONS_REVOKED",
      actorType: "ADMIN",
      actorId: req.admin._id,
      targetType: "USER",
      targetId: id,
      details: { modifiedCount: result.modifiedCount }
    });

    res.json({
      success: true,
      message: `Revoked all active sessions (${result.modifiedCount} sessions ended)`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get devices of a specific user
 */
export async function getUserDevices(req, res, next) {
  try {
    const devices = await Device.find({ userId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, devices });
  } catch (error) {
    next(error);
  }
}

/**
 * Block a specific device (frees up device slot, revokes active sessions)
 */
export async function blockDeviceHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const device = await blockDevice(id, req.admin._id, reason);

    res.json({
      success: true,
      message: "Device blocked successfully. Active sessions revoked and slot released.",
      device
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unblock a device (allocates slot if available)
 */
export async function unblockDeviceHandler(req, res, next) {
  try {
    const { id } = req.params;
    const device = await unblockDevice(id, req.admin._id);

    res.json({
      success: true,
      message: "Device unblocked successfully.",
      device
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update subscription
 */
export async function updateSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const { status, expiryDate, maxDevices } = req.body;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    if (status) subscription.status = status;
    if (expiryDate) subscription.expiryDate = new Date(expiryDate);
    if (maxDevices) {
      subscription.maxDevices = maxDevices;
      await User.findByIdAndUpdate(subscription.userId, { maxDevices });
    }

    await subscription.save();

    await AuditLog.create({
      action: "SUBSCRIPTION_UPDATED",
      actorType: "ADMIN",
      actorId: req.admin._id,
      targetType: "SUBSCRIPTION",
      targetId: subscription._id,
      details: { status, expiryDate, maxDevices }
    });

    res.json({
      success: true,
      message: "Subscription updated successfully",
      subscription
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List payments
 */
export async function getPayments(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate("processedBy", "username")
        .populate("createdUserId", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(query)
    ]);

    res.json({
      success: true,
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Approve payment
 */
export async function approvePaymentHandler(req, res, next) {
  try {
    const { id } = req.params;
    const result = await approvePayment(id, req.admin._id);

    res.json({
      success: true,
      message: "Payment approved successfully. Subscription activated and credentials generated.",
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject payment
 */
export async function rejectPaymentHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { reason = "Manual verification failed" } = req.body || {};

    const payment = await rejectPayment(id, req.admin._id, reason);

    res.json({
      success: true,
      message: "Payment rejected",
      payment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * View audit logs
 */
export async function getAuditLogs(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments()
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
}

