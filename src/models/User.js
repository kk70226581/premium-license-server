import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      index: true
    },
    passwordHash: {
      type: String,
      default: null
    },
    // Allows admin to see and re-copy customer credentials on demand
    plainPasswordPreview: {
      type: String,
      default: null
    },
    // Optional 3-digit PIN / Lock code configured by admin or user
    lockCode: {
      type: String,
      default: null,
      trim: true
    },
    status: {
      type: String,
      enum: ["PENDING_ACTIVATION", "ACTIVE", "BLOCKED"],
      default: "ACTIVE",
      index: true
    },
    maxDevices: {
      type: Number,
      default: 2,
      min: 1
    },
    // Array of active device ObjectIds for atomic slot allocation
    activeDeviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device"
      }
    ],
    currentSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null
    },
    metadata: {
      email: String,
      phone: String,
      notes: String
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("User", userSchema);

