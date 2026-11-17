import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment configuration");
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[Database] MongoDB connected successfully (${mongoose.connection.host || "host"})`);
  } catch (error) {
    console.error(`[Database] MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

