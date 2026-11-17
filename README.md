# Windows Qt6 Subscription & License Management Backend

A production-ready, commercial Node.js + Express backend designed for licensing, subscription management, Windows device identification, and remote access control for Windows desktop applications (C++ / Qt6 / QtWebEngine).

---

## 🌟 Key Features

1. **Cryptographic Windows Device Identity**
   - Challenge-response authentication using Windows CNG private keys.
   - Prevents cloning or spoofing of installation UUIDs.
2. **Strict Two-Device Limit Enforcement**
   - High-concurrency atomic slot allocation (`activeDeviceIds` array).
   - Prevents race conditions during simultaneous logins.
3. **Subscriptions & Activation**
   - Server-enforced subscription plans (Monthly, Annual, Lifetime).
   - High-entropy one-time activation keys (`ACT-XXXX-XXXX-XXXX-XXXX`).
   - Secure Argon2id password hashing.
4. **Immediate Remote Access Control**
   - Individual device blocking & unblocking.
   - Remote logout of single or all devices.
   - Account suspension with immediate session revocation.
5. **Manual UPI / Bank Payment Approval**
   - Submission of bank UTR / transaction references with replay protection.
   - Admin approval generates customer account, active subscription, and one-time activation key.
6. **Hardened Security Architecture**
   - Short-lived JWT access tokens (15m).
   - Rotating refresh tokens with SHA-256 hashed storage.
   - Dual rate-limiting (general API and brute-force auth protection).
   - Helmet HTTP headers and origin-restricted CORS.
   - Immutable audit logging for administrative and security actions.

---

## 📁 Project Structure

```text
server/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection handler
│   │   └── plans.js             # Subscription plans and pricing definitions
│   ├── models/
│   │   ├── User.js              # Customer accounts & activeDeviceIds array
│   │   ├── Admin.js             # Administrator credentials
│   │   ├── Subscription.js      # Plan details and expiry dates
│   │   ├── License.js           # One-time activation keys (hashed)
│   │   ├── Device.js            # Windows devices & public keys
│   │   ├── Session.js           # Active login sessions & rotating refresh tokens
│   │   ├── Payment.js           # UPI payment submissions (UTR)
│   │   ├── Challenge.js         # Nonces for device signature verification
│   │   └── AuditLog.js          # Security & administrative actions
│   ├── controllers/
│   │   ├── auth.controller.js   # Activation, challenge, login, refresh, profile
│   │   ├── device.controller.js # Heartbeat and device inspection
│   │   ├── payment.controller.js# Payment submission and status
│   │   └── admin.controller.js  # Dashboard, device blocking, payments approval
│   ├── middleware/
│   │   ├── auth.middleware.js   # Customer session, account & subscription verification
│   │   ├── admin.middleware.js  # Admin JWT verification
│   │   ├── validate.middleware.js# Zod schema validation
│   │   └── error.middleware.js  # Centralized error handler
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── device.routes.js
│   │   ├── payment.routes.js
│   │   └── admin.routes.js
│   ├── services/
│   │   ├── device.service.js    # Atomic 2-device slot allocation logic
│   │   ├── license.service.js   # Activation key generation & redemption
│   │   ├── session.service.js   # Token generation & rotation
│   │   └── payment.service.js   # Payment processing & account creation
│   ├── utils/
│   │   ├── crypto.js            # Argon2id, SHA-256, device signature verification
│   │   └── token.js             # JWT generation & validation
│   └── server.js                # Express app entrypoint
├── scripts/
│   ├── seedAdmin.js             # Bootstrap default superadmin
│   └── testFlow.js              # Comprehensive lifecycle test script
├── .env.example
├── .env
├── package.json
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Configure MongoDB Atlas
1. Open [MongoDB Atlas](https://www.mongodb.com/atlas) and create your cluster.
2. Create a database user (e.g. `license_backend` with a strong password).
3. Under **Network Access**, add your current IP address (or `0.0.0.0/0` for initial cloud development).
4. Get your connection URI:
   ```text
   mongodb+srv://license_backend:<PASSWORD>@<CLUSTER>.mongodb.net/premium_license?retryWrites=true&w=majority
   ```

### 2. Configure Environment (`.env`)
Update `.env` with your settings:
```env
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb+srv://license_backend:YOUR_PASSWORD@cluster.mongodb.net/premium_license
JWT_ACCESS_SECRET=your_super_secret_hex_string_min_32_characters
ADMIN_ORIGIN=http://localhost:5173
ADMIN_SETUP_SECRET=your_bootstrap_setup_secret
```

### 3. Bootstrap Superadmin
Run the seeding script to create your initial administrator account:
```bash
npm run seed:admin
```
Default credentials:
- **Username**: `admin`
- **Email**: `admin@example.com`
- **Password**: `Admin@123456`

### 4. Start the Server
- Development mode (with live reload):
  ```bash
  npm run dev
  ```
- Production mode:
  ```bash
  npm start
  ```

Health check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 📡 API Reference

### 🔐 Customer Authentication (`/api/auth`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/challenge` | Request nonce for Windows device signature verification |
| `POST` | `/api/auth/activate` | Redeem one-time activation key and set permanent password |
| `POST` | `/api/auth/login` | Authenticate customer, verify device, allocate slot, return tokens |
| `POST` | `/api/auth/refresh` | Rotate refresh token and receive new short-lived JWT |
| `POST` | `/api/auth/logout` | Revoke current device session (`Bearer <token>`) |
| `GET`  | `/api/auth/me` | Fetch customer profile, subscription, and device status |

#### Login Request Payload Example (Qt Application)
```json
{
  "username": "karan123",
  "password": "CustomerPassword123",
  "installationId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceName": "Karan Windows Laptop",
  "platform": "WINDOWS",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
  "nonce": "optional_server_issued_challenge_nonce",
  "signature": "optional_cng_base64_signature"
}
```

---

### 💻 Device Operations (`/api/device`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/device/heartbeat` | Client heartbeat to update `lastSeenAt` and check device status |
| `GET`  | `/api/device/my-devices`| List customer's registered devices (up to 2) |

---

### 💳 Payments & Subscription (`/api/payments`)

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/payments/plans` | List available subscription plans and prices |
| `POST` | `/api/payments/submit` | Submit manual UPI transaction reference (UTR) |
| `GET`  | `/api/payments/status?utr=...` | Check approval status of submitted UTR |

---

### 🛡️ Admin Dashboard (`/api/admin`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Administrator authentication |
| `POST` | `/api/admin/setup` | Create admin using `ADMIN_SETUP_SECRET` |
| `GET`  | `/api/admin/overview` | High-level metrics (users, devices, subscriptions, payments) |
| `GET`  | `/api/admin/users` | List customer accounts with pagination and filters |
| `GET`  | `/api/admin/users/:id` | Full customer details, active devices, and license history |
| `POST` | `/api/admin/users/:id/block` | Suspend customer account & revoke all sessions immediately |
| `POST` | `/api/admin/users/:id/unblock` | Restore customer account |
| `POST` | `/api/admin/users/:id/revoke-sessions` | Remotely log out all devices for a customer |
| `POST` | `/api/admin/devices/:id/block` | Block specific device, free slot, revoke sessions |
| `POST` | `/api/admin/devices/:id/unblock` | Unblock device (if 2-device limit is not exceeded) |
| `GET`  | `/api/admin/payments` | List pending / approved / rejected payment submissions |
| `POST` | `/api/admin/payments/:id/approve` | Approve payment, create user, subscription & activation key |
| `POST` | `/api/admin/payments/:id/reject` | Reject payment with reason |
| `GET`  | `/api/admin/audit-logs` | Immutable audit logs of all security actions |

---

## ⚙️ Qt6 Windows C++ Integration Notes

### Recommended Windows Technologies:
- **`QUuid`**: Generate persistent installation identifier stored in local Windows registry or AppData.
- **`Windows CNG` (`NCryptCreatePersistedKey`)**: Generate device cryptographic key pair stored safely in the Windows Key Storage Provider (TPM backed when available).
- **`QNetworkAccessManager`**: Send asynchronous JSON requests over HTTPS.
- **`Windows DPAPI` (`CryptProtectData`)**: Protect local refresh token on disk.

When communicating with this backend:
1. First launch: call `POST /api/auth/challenge` with the installation UUID.
2. Sign the nonce with your CNG private key.
3. Send `POST /api/auth/login` containing the username, password, installationId, deviceName, publicKey, nonce, and base64 signature.
4. Keep the returned `accessToken` in memory and send it in the `Authorization: Bearer <token>` header for subsequent API calls.
5. Send a heartbeat every 2–5 minutes to `/api/device/heartbeat`. If the server responds with `DEVICE_BLOCKED` or `SESSION_REVOKED`, the application terminates the session.

