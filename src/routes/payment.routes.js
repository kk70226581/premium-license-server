import { Router } from "express";
import {
  getPlans,
  submitPaymentHandler,
  checkPaymentStatus,
  submitPaymentSchema
} from "../controllers/payment.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";

const router = Router();

// Public subscription plans
router.get("/plans", getPlans);

// Submit UPI reference (UTR)
router.post("/submit", validateBody(submitPaymentSchema), submitPaymentHandler);

// Check submission status by UTR
router.get("/status", checkPaymentStatus);

export default router;

