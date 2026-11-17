import crypto from "crypto";
import argon2 from "argon2";

/**
 * Hash password using Argon2id
 */
export async function hashPassword(plainPassword) {
  return await argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1
  });
}

/**
 * Verify password with Argon2id hash
 */
export async function verifyPassword(hash, plainPassword) {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    return false;
  }
}

/**
 * Fast cryptographic SHA-256 hash (used for activation keys & refresh tokens)
 */
export function hashSha256(data) {
  return crypto.createHash("sha256").update(String(data)).digest("hex");
}

/**
 * Generate secure random hex token
 */
export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Generate high-entropy customer activation key
 * Format: ACT-XXXX-XXXX-XXXX-XXXX
 */
export function generateActivationKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // unambiguous base32 chars
  const randomBytes = crypto.randomBytes(16);
  let result = "ACT";
  for (let i = 0; i < 16; i++) {
    if (i % 4 === 0) result += "-";
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * Verify cryptographic signature from Windows client
 * (Windows CNG private key signs the server-issued challenge nonce)
 */
export function verifyDeviceSignature(publicKey, nonce, signatureBase64) {
  try {
    // Format public key if raw base64 or PEM
    let formattedKey = publicKey;
    if (typeof publicKey === "string" && !publicKey.includes("BEGIN")) {
      formattedKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    }

    const verifier = crypto.createVerify("SHA256");
    verifier.update(Buffer.from(nonce, "utf8"));
    verifier.end();

    return verifier.verify(formattedKey, Buffer.from(signatureBase64, "base64"));
  } catch (error) {
    console.error(`[Crypto] Device signature verification failed: ${error.message}`);
    return false;
  }
}

