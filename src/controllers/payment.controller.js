import { z } from "zod";
import Payment from "../models/Payment.js";
import { SUBSCRIPTION_PLANS } from "../config/plans.js";
import { submitPayment } from "../services/payment.service.js";

export const submitPaymentSchema = z.object({
  utr: z.string().min(6, "Valid UTR / Transaction Reference is required").max(64),
  customerName: z.string().min(2, "Name is required").max(100),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().optional(),
  requestedPlan: z.enum(["MONTHLY", "YEARLY", "LIFETIME"])
});

/**
 * Get available subscription plans and pricing
 */
export async function getPlans(req, res) {
  res.json({
    success: true,
    plans: Object.values(SUBSCRIPTION_PLANS)
  });
}

/**
 * Submit manual UPI payment request
 */
export async function submitPaymentHandler(req, res, next) {
  try {
    const payment = await submitPayment(req.body);
    res.status(201).json({
      success: true,
      message: "Payment submitted successfully. Admin verification pending.",
      payment: {
        id: payment._id,
        utr: payment.utr,
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
        plan: payment.requestedPlan,
        amount: payment.amount,
        status: payment.status,
        submittedAt: payment.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Customer checks status of their submitted UTR
 */
export async function checkPaymentStatus(req, res, next) {
  try {
    const { utr } = req.query;
    if (!utr) {
      return res.status(400).json({
        success: false,
        message: "UTR query parameter is required"
      });
    }

    const payment = await Payment.findOne({ utr: utr.trim().toUpperCase() })
      .populate("createdUserId", "username status")
      .select("utr customerEmail requestedPlan amount status rejectionReason processedAt createdAt");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found for this UTR"
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    next(error);
  }
}

