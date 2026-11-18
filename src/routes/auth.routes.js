import { Router } from "express";
import {
  getChallenge,
  activateAccount,
  login,
  refresh,
  logout,
  getMe,
  authenticateHandler,
  sessionHeartbeatHandler,
  sessionLogoutHandler,
  challengeSchema,
  activateSchema,
  loginSchema,
  refreshSchema
} from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Challenge for cryptographic device signature
router.post("/challenge", validateBody(challengeSchema), getChallenge);

// Account activation with one-time activation key
router.post("/activate", validateBody(activateSchema), activateAccount);

// Customer login from Qt desktop app
router.post("/login", validateBody(loginSchema), login);

// HRX Browser / Qt6 client session endpoints
router.post("/authenticate", authenticateHandler);
router.post("/session/heartbeat", sessionHeartbeatHandler);
router.post("/session/logout", sessionLogoutHandler);

// Refresh access token
router.post("/refresh", validateBody(refreshSchema), refresh);

// Protected customer endpoints
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, getMe);

export default router;

