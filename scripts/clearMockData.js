import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/database.js";
import User from "../src/models/User.js";
import Device from "../src/models/Device.js";
import Session from "../src/models/Session.js";
import Subscription from "../src/models/Subscription.js";
import Payment from "../src/models/Payment.js";
import License from "../src/models/License.js";
import Challenge from "../src/models/Challenge.js";
import AuditLog from "../src/models/AuditLog.js";
import Admin from "../src/models/Admin.js";

async function clearMockData() {
  console.log("Connecting to MongoDB Atlas...");
  await connectDB();

  console.log("\n--- Cleaning up all mock & test data ---");

  const [
    deletedUsers,
    deletedDevices,
    deletedSessions,
    deletedSubscriptions,
    deletedPayments,
    deletedLicenses,
    deletedChallenges,
    deletedAuditLogs
  ] = await Promise.all([
    User.deleteMany({}),
    Device.deleteMany({}),
    Session.deleteMany({}),
    Subscription.deleteMany({}),
    Payment.deleteMany({}),
    License.deleteMany({}),
    Challenge.deleteMany({}),
    AuditLog.deleteMany({})
  ]);

  console.log(`Deleted Users         : ${deletedUsers.deletedCount}`);
  console.log(`Deleted Devices       : ${deletedDevices.deletedCount}`);
  console.log(`Deleted Sessions      : ${deletedSessions.deletedCount}`);
  console.log(`Deleted Subscriptions : ${deletedSubscriptions.deletedCount}`);
  console.log(`Deleted Payments      : ${deletedPayments.deletedCount}`);
  console.log(`Deleted Licenses      : ${deletedLicenses.deletedCount}`);
  console.log(`Deleted Challenges    : ${deletedChallenges.deletedCount}`);
  console.log(`Deleted Audit Logs    : ${deletedAuditLogs.deletedCount}`);

  // Create an initial system audit log
  const admin = await Admin.findOne({ username: "admin" });
  if (admin) {
    await AuditLog.create({
      action: "DATABASE_CLEARED_FOR_PRODUCTION",
      actorType: "ADMIN",
      actorId: admin._id,
      targetType: null,
      details: {
        message: "All mock and test data removed. System ready for live users.",
        timestamp: new Date().toISOString()
      }
    });
    console.log(`Preserved Superadmin : ${admin.username} (${admin.email})`);
  }

  console.log("\n✅ MongoDB Atlas is completely cleaned up and ready for production!");
  process.exit(0);
}

clearMockData().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
