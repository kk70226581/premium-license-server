import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ["ACTIVE", "REVOKED", "EXPIRED"],
      default: "ACTIVE",
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    ip: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Session", sessionSchema);

