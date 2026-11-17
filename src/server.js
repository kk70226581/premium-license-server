import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { connectDB } from "./config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardDist = path.join(__dirname, "../dashboard/dist");

// Routes
import authRoutes from "./routes/auth.routes.js";
import deviceRoutes from "./routes/device.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

// Security hardening
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// Cross-Origin Resource Sharing (allows desktop clients, localhost, Vercel, and Render dashboards)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Body parser
app.use(express.json({ limit: "32kb" }));

// General Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});
app.use("/api", generalLimiter);

// Stricter Rate Limiter for Authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // 30 attempts per 15 minutes
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login/activation attempts. Please try again after 15 minutes."
  }
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/activate", authLimiter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  res.json({
    success: true,
    server: "running",
    database: isDbReady ? "connected" : "disconnected",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

// Static Admin Dashboard
if (fs.existsSync(dashboardDist)) {
  app.use("/admin", express.static(dashboardDist));
  app.use("/assets", express.static(path.join(dashboardDist, "assets")));
  app.use((req, res, next) => {
    if (req.method === "GET") {
      if (req.path === "/" || req.path === "/admin") {
        return res.redirect("/admin/");
      }
      if (req.path.startsWith("/admin")) {
        return res.sendFile(path.join(dashboardDist, "index.html"));
      }
    }
    next();
  });
}

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    code: "NOT_FOUND"
  });
});

// Centralized Error Middleware
app.use(errorHandler);

// Server startup
async function startServer() {
  try {
    if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
      throw new Error("Invalid JWT_ACCESS_SECRET: secret must be at least 32 characters");
    }

    // Connect to MongoDB
    await connectDB();

    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log(`[Server] License & Device Management Server running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("[Server] Startup failed:", error.message);
    process.exit(1);
  }
}

// Start if executed directly (and not running in a serverless environment like Vercel)
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  startServer();
}

export default app;

