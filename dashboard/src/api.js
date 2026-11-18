const STORAGE_TOKEN_KEY = "admin_license_token";
const STORAGE_USER_KEY = "admin_license_user";
const STORAGE_API_BASE = "admin_license_api_base";

const DEFAULT_API = import.meta.env.VITE_API_URL || "https://kk-auth.vercel.app/api";

export function getApiBase() {
  const custom = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_API_BASE) : null;
  return custom || DEFAULT_API;
}

export function setApiBase(url) {
  if (url) {
    localStorage.setItem(STORAGE_API_BASE, url.replace(/\/$/, ""));
  } else {
    localStorage.removeItem(STORAGE_API_BASE);
  }
}

export function getStoredAuth() {
  try {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_TOKEN_KEY) : null;
    const user = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_USER_KEY) : null;
    return {
      token,
      user: user ? JSON.parse(user) : null
    };
  } catch {
    return { token: null, user: null };
  }
}

export function storeAuth(token, user) {
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}

async function request(endpoint, options = {}) {
  const { token } = getStoredAuth();
  const apiBase = getApiBase();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes("/login")) {
      clearAuth();
      window.dispatchEvent(new Event("auth:logout"));
    }
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  login: (usernameOrEmail, password) =>
    request("/admin/login", {
      method: "POST",
      body: JSON.stringify({ usernameOrEmail, password })
    }),

  getOverview: () => request("/admin/overview"),

  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/users${query ? `?${query}` : ""}`);
  },

  getUserDetails: (id) => request(`/admin/users/${id}`),

  createUser: (data) =>
    request("/admin/users", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateUser: (id, data) =>
    request(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  deleteUser: (id) =>
    request(`/admin/users/${id}`, {
      method: "DELETE"
    }),

  unpairDevice: (userId, deviceId) =>
    request(`/admin/users/${userId}/devices/${deviceId}/unpair`, {
      method: "POST"
    }),

  blockUser: (id, reason) =>
    request(`/admin/users/${id}/block`, {
      method: "POST",
      body: JSON.stringify({ reason })
    }),

  unblockUser: (id) =>
    request(`/admin/users/${id}/unblock`, {
      method: "POST"
    }),

  revokeUserSessions: (id) =>
    request(`/admin/users/${id}/revoke-sessions`, {
      method: "POST"
    }),

  getUserDevices: (userId) => request(`/admin/users/${userId}/devices`),

  blockDevice: (deviceId, reason) =>
    request(`/admin/devices/${deviceId}/block`, {
      method: "POST",
      body: JSON.stringify({ reason })
    }),

  unblockDevice: (deviceId) =>
    request(`/admin/devices/${deviceId}/unblock`, {
      method: "POST"
    }),

  updateSubscription: (id, updateData) =>
    request(`/admin/subscriptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updateData)
    }),

  getPayments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/payments${query ? `?${query}` : ""}`);
  },

  approvePayment: (paymentId) =>
    request(`/admin/payments/${paymentId}/approve`, {
      method: "POST"
    }),

  rejectPayment: (paymentId, reason) =>
    request(`/admin/payments/${paymentId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason })
    }),

  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/audit-logs${query ? `?${query}` : ""}`);
  }
};

