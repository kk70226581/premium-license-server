import mongoose from "mongoose";

const licenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    keyPrefix: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["GENERATED", "REDEEMED", "REVOKED"],
      default: "GENERATED",
      index: true
    },
    redeemedAt: {
      type: Date,
      default: null
    },
    redeemedByIp: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("License", licenseSchema);

