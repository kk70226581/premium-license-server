import app from "../src/server.js";
import { connectDB } from "../src/config/database.js";

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (error) {
    console.error("[Serverless Handler] Database connection error:", error.message);
  }
  return app(req, res);
}
