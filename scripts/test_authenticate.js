import "dotenv/config";
import mongoose from "mongoose";
import app from "../src/server.js";
import http from "http";

async function runTest() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(8001, resolve));
  console.log("Local test server listening on 8001");

  try {
    // 1. Test /api/authenticate
    const authPayload = {
      username: "hrx_user_8891",
      password: "Hrx@VTppSX",
      installation_id: "493aecec-7d73-43b5-be50-eb33b3ee6865",
      request_nonce: "nonce-" + Date.now(),
      protocol_version: 2
    };

    console.log("\n--- Testing POST /api/authenticate ---");
    const res = await fetch("http://localhost:8001/api/authenticate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ziva-installation-id": "493aecec-7d73-43b5-be50-eb33b3ee6865",
        "x-ziva-protocol-version": "2",
        "x-ziva-client-version": "5.1.1"
      },
      body: JSON.stringify(authPayload)
    });

    const status = res.status;
    const headers = Object.fromEntries(res.headers.entries());
    const data = await res.json();

    console.log("Status:", status);
    console.log("x-ziva-protocol-version:", headers["x-ziva-protocol-version"]);
    console.log("x-ziva-client-version:", headers["x-ziva-client-version"]);
    console.log("Response payload:", JSON.stringify(data, null, 2));

    // Validations:
    if (data.protocol_version !== 2) throw new Error("protocol_version must be 2");
    if (data.success !== true) throw new Error("success must be true");
    if (data.status !== "active") throw new Error("status must be active");
    if (!data.access_token) throw new Error("access_token is required");
    if (!data.access_token_base64) throw new Error("access_token_base64 is required");
    if (data.username !== authPayload.username) throw new Error("username must match request username");
    if (data.request_nonce !== authPayload.request_nonce) throw new Error("request_nonce must match request nonce");
    if (typeof data.expires_in !== "number" || data.expires_in < 300 || data.expires_in > 90000) {
      throw new Error("expires_in must be between 300 and 90000");
    }
    if (typeof data.heartbeat_interval_seconds !== "number") throw new Error("heartbeat_interval_seconds must be number");
    if (!data.session_id) throw new Error("session_id is required");
    if (!data.device_id) throw new Error("device_id is required");
    if (!data.installation_id) throw new Error("installation_id is required");

    console.log("\n✅ ALL /api/authenticate PROTOCOL-V2 ASSERTIONS PASSED 100%!");

    // 2. Test /api/auth/session/heartbeat
    console.log("\n--- Testing POST /api/auth/session/heartbeat ---");
    const hbRes = await fetch("http://localhost:8001/api/auth/session/heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + data.access_token,
        "x-ziva-installation-id": data.installation_id,
        "x-ziva-protocol-version": "2",
        "x-ziva-client-version": "5.1.1"
      },
      body: JSON.stringify({
        session_id: data.session_id,
        device_id: data.device_id,
        installation_id: data.installation_id
      })
    });

    const hbStatus = hbRes.status;
    const hbData = await hbRes.json();
    console.log("Heartbeat Status:", hbStatus);
    console.log("Heartbeat Data:", JSON.stringify(hbData, null, 2));

    if (hbData.protocol_version !== 2) throw new Error("hb protocol_version must be 2");
    if (hbData.heartbeat_ack !== true) throw new Error("hb heartbeat_ack must be true");
    if (hbData.status !== "active") throw new Error("hb status must be active");

    console.log("\n✅ ALL /api/auth/session/heartbeat ASSERTIONS PASSED 100%!");
  } finally {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
