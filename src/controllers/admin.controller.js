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
 * Create a new user account with generated or specified credentials
 */
export async function createUser(req, res, next) {
  try {
    let {
      username,
      password,
      lockCode,
      plan = "STANDARD",
      durationDays = 30,
      maxDevices = 2,
      notes,
      email
    } = req.body;

    // Auto-generate username if empty
    if (!username || !username.trim()) {
      username = "user_" + Math.random().toString(36).substring(2, 8);
    }
    username = username.toLowerCase().trim();

    // Auto-generate password if empty
    if (!password || !password.trim()) {
      password = "Hrx@" + Math.floor(100000 + Math.random() * 900000);
    }
    password = password.trim();

    if (lockCode) {
      lockCode = String(lockCode).trim();
    }

    // Check existing
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Username '${username}' is already taken. Please choose another or generate one.`,
        code: "USERNAME_TAKEN"
      });
    }

    const passwordHash = await hashPassword(password);
    const duration = parseInt(durationDays) || 30;
    const expiryDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

    const user = await User.create({
      username,
      passwordHash,
      plainPasswordPreview: password,
      lockCode: lockCode || null,
      status: "ACTIVE",
      maxDevices: parseInt(maxDevices) || 2,
      metadata: {
        email: email || undefined,
        notes: notes || `Created by admin ${req.admin?.username || "console"}`
      }
    });

    let planType = (plan || "MONTHLY").toUpperCase();
    if (!["MONTHLY", "YEARLY", "LIFETIME", "STANDARD", "CUSTOM", "ANNUAL"].includes(planType)) {
      planType = "MONTHLY";
    }

    const subscription = await Subscription.create({
      userId: user._id,
      plan: planType,
      status: "ACTIVE",
      expiryDate,
      startDate: new Date()
    });

    user.currentSubscriptionId = subscription._id;
    await user.save();

    await AuditLog.create({
      action: "USER_CREATED_BY_ADMIN",
      actorType: "ADMIN",
      actorId: req.admin._id,
      targetType: "USER",
      targetId: user._id,
      details: {
        username: user.username,
        plan,
        durationDays: duration,
        maxDevices: user.maxDevices,
        hasLockCode: Boolean(lockCode)
      }
    });

    res.status(201).json({
      success: true,
      message: "Customer account created successfully",
      user: {
        id: user._id,
        username: user.username,
        plainPasswordPreview: user.plainPasswordPreview,
        lockCode: user.lockCode,
        status: user.status,
        maxDevices: user.maxDevices,
        currentSubscriptionId: subscription
      },
      credentials: {
        username: user.username,
        password: password,
        lockCode: lockCode || "None (Optional)",
        expiryDate: expiryDate.toISOString(),
        serverUrl: "https://kk-auth.vercel.app"
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user account (modify username, password, lock code, max devices, status, expiry)
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const {
      username,
      password,
      lockCode,
      maxDevices,
      status,
      durationDays,
      expiryDate,
      notes,
      email
    } = req.body;

    const user = await User.findById(id).populate("currentSubscriptionId");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 1. Update username if changed
    if (username && username.toLowerCase().trim() !== user.username) {
      const cleanUsername = username.toLowerCase().trim();
      const existing = await User.findOne({ username: cleanUsername, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Username '${cleanUsername}' is already taken by another account.`
        });
      }
      user.username = cleanUsername;
    }

    // 2. Update password if provided
    if (password && password.trim()) {
      user.passwordHash = await hashPassword(password.trim());
      user.plainPasswordPreview = password.trim();
    }

    // 3. Update lock code (3-digit PIN)
    if (lockCode !== undefined) {
      user.lockCode = lockCode ? String(lockCode).trim() : null;
    }

    // 4. Update max devices
    if (maxDevices !== undefined) {
      const parsedMax = parseInt(maxDevices);
      if (parsedMax >= 1) {
        user.maxDevices = parsedMax;
      }
    }

    // 5. Update status
    if (status && ["ACTIVE", "BLOCKED", "PENDING_ACTIVATION"].includes(status)) {
      user.status = status;
      if (status === "BLOCKED") {
        await revokeAllUserSessions(user._id);
      }
    }

    // 6. Update metadata
    if (notes !== undefined || email !== undefined) {
      user.metadata = {
        ...user.metadata,
        ...(email !== undefined ? { email } : {}),
        ...(notes !== undefined ? { notes } : {})
      };
    }

    // 7. Update subscription expiry date if requested
    if (expiryDate || durationDays) {
      let sub = await Subscription.findOne({ userId: user._id, status: "ACTIVE" });
      if (!sub) {
        sub = await Subscription.findOne({ userId: user._id }).sort({ expiryDate: -1 });
      }

      let newExpiry;
      if (expiryDate) {
        newExpiry = new Date(expiryDate);
      } else if (durationDays) {
        newExpiry = new Date(Date.now() + parseInt(durationDays) * 24 * 60 * 60 * 1000);
      }

      if (sub && newExpiry) {
        sub.expiryDate = newExpiry;
        sub.status = newExpiry > new Date() ? "ACTIVE" : "EXPIRED";
        await sub.save();
      } else if (newExpiry) {
        const newSub = await Subscription.create({
          userId: user._id,
          plan: "STANDARD",
          status: newExpiry > new Date() ? "ACTIVE" : "EXPIRED",
          expiryDate: newExpiry,
          startDate: new Date()
        });
        user.currentSubscriptionId = newSub._id;
      }
    }

    await user.save();

    await AuditLog.create({
      action: "USER_MODIFIED_BY_ADMIN",
      actorType: "ADMIN",
      actorId: req.admin._id,
      targetType: "USER",
      targetId: user._id,
      details: {
        username: user.username,
        updatedFields: Object.keys(req.body)
      }
    });

    const updatedUser = await User.findById(id)
      .populate("currentSubscriptionId")
      .populate("activeDeviceIds", "deviceName status platform lastSeenAt installationId");

    res.json({
      success: true,
      message: `User ${user.username} updated successfully`,
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete user account permanently
 */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await revokeAllUserSessions(user._id);
    await Device.deleteMany({ userId: user._id });
    await Subscription.deleteMany({ userId: user._id });
    await License.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(id);

    await AuditLog.create({
      action: "USER_DELETED_BY_ADMIN",
      actorType: "ADMIN",
      actorId: req.admin._id,
      targetType: "USER",
      targetId: id,
      details: { username: user.username }
    });

    res.json({
      success: true,
      message: `User ${user.username} deleted permanently`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unpair device from user account to free a slot
 */
export async function unpairUserDevice(req, res, next) {
  try {
    const { id, deviceId } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.activeDeviceIds = user.activeDeviceIds.filter(
      (dId) => dId.toString() !== deviceId.toString()
    );
    await user.save();

    await revokeDeviceSessions(deviceId);
    await Device.findByIdAndUpdate(deviceId, { status: "REVOKED" });

    await AuditLog.create({
      action: "DEVICE_UNPAIRED_BY_ADMIN",
      actorType: "ADMIN",
      actorId: req.admin._id,
      targetType: "DEVICE",
      targetId: deviceId,
      details: {
        userId: user._id,
        username: user.username,
        remainingSlots: user.maxDevices - user.activeDeviceIds.length
      }
    });

    res.json({
      success: true,
      message: `Device unpaired successfully. 1 device slot freed for ${user.username}.`,
      activeDeviceIds: user.activeDeviceIds
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

