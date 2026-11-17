import "dotenv/config";
import mongoose from "mongoose";
import Admin from "../src/models/Admin.js";
import { connectDB } from "../src/config/database.js";
import { hashPassword } from "../src/utils/crypto.js";

async function seed() {
  try {
    await connectDB();

    const username = process.env.ADMIN_DEFAULT_USER || "admin";
    const email = process.env.ADMIN_DEFAULT_EMAIL || "admin@example.com";
    const password = process.env.ADMIN_DEFAULT_PASS || "Admin@123456";

    const existing = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existing) {
      console.log(`[Seed] Admin user already exists: ${existing.username} (${existing.email})`);
      process.exit(0);
    }

    const passwordHash = await hashPassword(password);
    const admin = await Admin.create({
      username,
      email,
      passwordHash,
      role: "SUPERADMIN",
      isActive: true
    });

    console.log(`[Seed] Superadmin created successfully!`);
    console.log(`  Username: ${admin.username}`);
    console.log(`  Email:    ${admin.email}`);
    console.log(`  Password: ${password}`);
    console.log(`[Seed] Please change this password after your first login.`);
    process.exit(0);
  } catch (error) {
    console.error("[Seed] Error seeding admin:", error.message);
    process.exit(1);
  }
}

seed();

