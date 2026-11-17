import { Router } from "express";
import {
  setupSuperadmin,
  adminLogin,
  getDashboardOverview,
  getUsers,
  getUserById,
  blockUser,
  unblockUser,
  revokeUserSessions,
  getUserDevices,
  blockDeviceHandler,
  unblockDeviceHandler,
  updateSubscription,
  getPayments,
  approvePaymentHandler,
  rejectPaymentHandler,
  getAuditLogs,
  adminSetupSchema,
  adminLoginSchema
} from "../controllers/admin.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

const router = Router();

// Public / Bootstrap Admin Routes
router.post("/setup", validateBody(adminSetupSchema), setupSuperadmin);
router.post("/login", validateBody(adminLoginSchema), adminLogin);

// Protected Admin Operations
router.get("/overview", requireAdmin, getDashboardOverview);
router.get("/users", requireAdmin, getUsers);
router.get("/users/:id", requireAdmin, getUserById);
router.post("/users/:id/block", requireAdmin, blockUser);
router.post("/users/:id/unblock", requireAdmin, unblockUser);
router.post("/users/:id/revoke-sessions", requireAdmin, revokeUserSessions);
router.get("/users/:id/devices", requireAdmin, getUserDevices);

router.post("/devices/:id/block", requireAdmin, blockDeviceHandler);
router.post("/devices/:id/unblock", requireAdmin, unblockDeviceHandler);

router.patch("/subscriptions/:id", requireAdmin, updateSubscription);

router.get("/payments", requireAdmin, getPayments);
router.post("/payments/:id/approve", requireAdmin, approvePaymentHandler);
router.post("/payments/:id/reject", requireAdmin, rejectPaymentHandler);

router.get("/audit-logs", requireAdmin, getAuditLogs);

export default router;

