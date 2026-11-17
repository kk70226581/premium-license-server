import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    plan: {
      type: String,
      enum: ["MONTHLY", "YEARLY", "LIFETIME"],
      required: true
    },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"],
      default: "ACTIVE",
      index: true
    },
    maxDevices: {
      type: Number,
      default: 2,
      min: 1
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Method to verify if subscription is currently valid
subscriptionSchema.methods.isValid = function () {
  return this.status === "ACTIVE" && new Date(this.expiryDate) > new Date();
};

export default mongoose.model("Subscription", subscriptionSchema);

