import jwt from "jsonwebtoken";

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

/**
 * Generate short-lived JWT access token
 */
export function generateAccessToken(payload) {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("Missing JWT_ACCESS_SECRET in environment");
  }
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
    algorithm: "HS256"
  });
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token) {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("Missing JWT_ACCESS_SECRET in environment");
  }
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

