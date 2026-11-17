import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema(
  {
    installationId: {
      type: String,
      required: true,
      index: true
    },
    nonce: {
      type: String,
      required: true,
      unique: true
    },
    used: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      required: true,
      // MongoDB TTL index: automatically deletes document when expiresAt arrives
      index: { expires: 0 }
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Challenge", challengeSchema);

