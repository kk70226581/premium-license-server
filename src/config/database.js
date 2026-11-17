import mongoose from "mongoose";

let cachedPromise = null;

export async function connectDB() {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If currently connecting, wait for existing promise
  if (cachedPromise && mongoose.connection.readyState === 2) {
    return await cachedPromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment configuration");
  }

  try {
    cachedPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    });

    await cachedPromise;
    console.log(`[Database] MongoDB connected successfully (${mongoose.connection.host || "Atlas"})`);
    return mongoose.connection;
  } catch (error) {
    cachedPromise = null;
    console.error(`[Database] MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
