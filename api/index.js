import app from "../src/server.js";
import { connectDB } from "../src/config/database.js";

let isDbConnected = false;

export default async function handler(req, res) {
  if (!isDbConnected) {
    await connectDB();
    isDbConnected = true;
  }
  return app(req, res);
}

