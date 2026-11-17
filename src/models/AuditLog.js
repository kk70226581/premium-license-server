import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true
    },
    actorType: {
      type: String,
      enum: ["ADMIN", "USER", "DEVICE", "SYSTEM"],
      required: true
    },
    actorId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    targetType: {
      type: String,
      enum: ["USER", "DEVICE", "SUBSCRIPTION", "PAYMENT", "SESSION", "LICENSE"],
      default: null
    },
    targetId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ip: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);

