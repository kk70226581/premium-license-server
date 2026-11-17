import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    installationId: {
      type: String,
      required: true,
      trim: true
    },
    deviceName: {
      type: String,
      required: true,
      trim: true
    },
    platform: {
      type: String,
      default: "WINDOWS"
    },
    publicKey: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["ACTIVE", "BLOCKED"],
      default: "ACTIVE",
      index: true
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    },
    lastIp: {
      type: String,
      default: null
    },
    appVersion: {
      type: String,
      default: "1.0.0"
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
deviceSchema.index({ userId: 1, installationId: 1 }, { unique: true });
deviceSchema.index({ userId: 1, status: 1 });

export default mongoose.model("Device", deviceSchema);

