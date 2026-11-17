import { Router } from "express";
import { heartbeat, getCustomerDevices } from "../controllers/device.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Heartbeat reporting from active Windows client
router.post("/heartbeat", requireAuth, heartbeat);

// View customer's own devices
router.get("/my-devices", requireAuth, getCustomerDevices);

export default router;

