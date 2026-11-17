import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    utr: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    customerPhone: {
      type: String,
      trim: true,
      default: null
    },
    requestedPlan: {
      type: String,
      enum: ["MONTHLY", "YEARLY", "LIFETIME"],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true
    },
    rejectionReason: {
      type: String,
      default: null
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },
    processedAt: {
      type: Date,
      default: null
    },
    createdUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Payment", paymentSchema);

