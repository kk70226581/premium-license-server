import crypto from "crypto";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import AuditLog from "../models/AuditLog.js";
import { getPlan } from "../config/plans.js";
import { generateLicense } from "./license.service.js";

/**
 * Submit manual UPI payment request
 */
export async function submitPayment({ utr, customerName, customerEmail, customerPhone, requestedPlan }) {
  const plan = getPlan(requestedPlan);
  if (!plan) {
    const err = new Error(`Invalid plan selected: ${requestedPlan}`);
    err.code = "INVALID_PLAN";
    throw err;
  }

  const normalizedUtr = utr.trim().toUpperCase();

  // Check unique UTR to prevent replay
  const existing = await Payment.findOne({ utr: normalizedUtr });
  if (existing) {
    const err = new Error("This UTR / Transaction Reference has already been submitted");
    err.code = "DUPLICATE_UTR";
    throw err;
  }

  const payment = await Payment.create({
    utr: normalizedUtr,
    customerName: customerName.trim(),
    customerEmail: customerEmail.toLowerCase().trim(),
    customerPhone: customerPhone ? customerPhone.trim() : null,
    requestedPlan: plan.id,
    amount: plan.price, // Authoritative price from server
    status: "PENDING"
  });

  return payment;
}

/**
 * Admin approves payment: activates subscription, generates account and activation key
 */
export async function approvePayment(paymentId, adminId = null) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new Error("Payment record not found");
  }

  if (payment.status !== "PENDING") {
    throw new Error(`Payment is already ${payment.status.toLowerCase()}`);
  }

  const plan = getPlan(payment.requestedPlan);
  if (!plan) {
    throw new Error(`Plan configuration not found for: ${payment.requestedPlan}`);
  }

  // 1. Find or create user account
  let user = await User.findOne({ "metadata.email": payment.customerEmail });
  let isNewAccount = false;

  if (!user) {
    // Generate clean username from name or email
    const baseName = payment.customerName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 10) || "user";
    const randomSuffix = crypto.randomInt(100, 999);
    let username = `${baseName}${randomSuffix}`;

    // Ensure uniqueness
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `${baseName}${randomSuffix}${counter++}`;
    }

    user = await User.create({
      username,
      status: "PENDING_ACTIVATION",
      maxDevices: plan.maxDevices,
      metadata: {
        email: payment.customerEmail,
        phone: payment.customerPhone
      }
    });
    isNewAccount = true;
  }

  // 2. Calculate subscription period
  const startDate = new Date();
  let expiryDate = new Date();

  // If user already had an active subscription, extend from current expiry date
  if (user.currentSubscriptionId) {
    const currentSub = await Subscription.findById(user.currentSubscriptionId);
    if (currentSub && new Date(currentSub.expiryDate) > new Date()) {
      expiryDate = new Date(currentSub.expiryDate);
    }
  }
  expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

  // 3. Create Subscription
  const subscription = await Subscription.create({
    userId: user._id,
    plan: plan.id,
    status: "ACTIVE",
    maxDevices: plan.maxDevices,
    startDate,
    expiryDate,
    paymentId: payment._id
  });

  user.currentSubscriptionId = subscription._id;
  user.maxDevices = plan.maxDevices;
  await user.save();

  // 4. Generate Activation Key if user is pending activation
  let plainActivationKey = null;
  if (isNewAccount || user.status === "PENDING_ACTIVATION") {
    const licenseResult = await generateLicense(user._id);
    plainActivationKey = licenseResult.plainActivationKey;
  }

  // 5. Update Payment record
  payment.status = "APPROVED";
  payment.processedBy = adminId;
  payment.processedAt = new Date();
  payment.createdUserId = user._id;
  await payment.save();

  // Audit log
  await AuditLog.create({
    action: "PAYMENT_APPROVED",
    actorType: adminId ? "ADMIN" : "SYSTEM",
    actorId: adminId,
    targetType: "PAYMENT",
    targetId: payment._id,
    details: {
      utr: payment.utr,
      amount: payment.amount,
      plan: plan.id,
      userId: user._id,
      username: user.username
    }
  });

  return {
    payment,
    user: {
      id: user._id,
      username: user.username,
      status: user.status
    },
    subscription: {
      id: subscription._id,
      plan: subscription.plan,
      startDate: subscription.startDate,
      expiryDate: subscription.expiryDate
    },
    activationKey: plainActivationKey
  };
}

/**
 * Admin rejects payment request with a reason
 */
export async function rejectPayment(paymentId, adminId = null, reason = "Payment verification failed") {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new Error("Payment record not found");
  }

  if (payment.status !== "PENDING") {
    throw new Error(`Payment is already ${payment.status.toLowerCase()}`);
  }

  payment.status = "REJECTED";
  payment.rejectionReason = reason;
  payment.processedBy = adminId;
  payment.processedAt = new Date();
  await payment.save();

  await AuditLog.create({
    action: "PAYMENT_REJECTED",
    actorType: adminId ? "ADMIN" : "SYSTEM",
    actorId: adminId,
    targetType: "PAYMENT",
    targetId: payment._id,
    details: { utr: payment.utr, reason }
  });

  return payment;
}

