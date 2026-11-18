import React, { useState, useEffect } from "react";
import {
  api,
  getStoredAuth,
  storeAuth,
  clearAuth,
  getApiBase,
  setApiBase
} from "./api.js";
import {
  Shield,
  Users,
  Laptop,
  CreditCard,
  History,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Lock,
  Key,
  Smartphone,
  ChevronRight,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Shuffle
} from "lucide-react";

export default function App() {
  const [auth, setAuth] = useState(getStoredAuth());
  const [activeTab, setActiveTab] = useState("overview");
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBase());

  // Global Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const handleLogout = () => setAuth({ token: null, user: null });
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  if (!auth.token) {
    return (
      <LoginView
        onLoginSuccess={(token, user) => setAuth({ token, user })}
        apiBaseUrl={apiBaseUrl}
        setApiBaseUrl={setApiBaseUrlState}
        showToast={showToast}
      />
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "10px",
            background: toast.type === "error" ? "#e11d48" : "#10b981",
            color: "#fff",
            fontWeight: 600,
            fontSize: "14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
        >
          {toast.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside
        style={{
          width: 260,
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-color)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 24
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 8 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #0284c7, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Shield size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>LicenseVault</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase" }}>Admin Console</div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SidebarBtn
            icon={<Shield size={18} />}
            label="Overview"
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          />
          <SidebarBtn
            icon={<Users size={18} />}
            label="Users & Devices"
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
          />
          <SidebarBtn
            icon={<CreditCard size={18} />}
            label="UPI Payments"
            active={activeTab === "payments"}
            onClick={() => setActiveTab("payments")}
          />
          <SidebarBtn
            icon={<History size={18} />}
            label="Security Audit Logs"
            active={activeTab === "audit"}
            onClick={() => setActiveTab("audit")}
          />
          <SidebarBtn
            icon={<Settings size={18} />}
            label="Server Settings"
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          />
        </nav>

        <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 8px" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{auth.user?.username || "Admin"}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{auth.user?.role || "SUPERADMIN"}</div>
            </div>
            <span className="badge badge-active">Live</span>
          </div>
          <button
            className="btn btn-outline"
            style={{ width: "100%", justifyContent: "flex-start" }}
            onClick={() => {
              clearAuth();
              setAuth({ token: null, user: null });
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
        {activeTab === "overview" && <OverviewTab showToast={showToast} setActiveTab={setActiveTab} />}
        {activeTab === "users" && <UsersTab showToast={showToast} />}
        {activeTab === "payments" && <PaymentsTab showToast={showToast} />}
        {activeTab === "audit" && <AuditLogsTab showToast={showToast} />}
        {activeTab === "settings" && (
          <SettingsTab
            apiBaseUrl={apiBaseUrl}
            onSave={(url) => {
              setApiBase(url);
              setApiBaseUrlState(url);
              showToast("API Endpoint saved!");
            }}
          />
        )}
      </main>
    </div>
  );
}

function SidebarBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        fontSize: 14,
        fontWeight: active ? 700 : 500,
        color: active ? "#fff" : "var(--text-muted)",
        background: active ? "rgba(59, 130, 246, 0.15)" : "transparent",
        border: active ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid transparent",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.15s ease"
      }}
    >
      {React.cloneElement(icon, { color: active ? "#38bdf8" : "var(--text-dim)" })}
      {label}
    </button>
  );
}

/* ----------------------------------------------------
   1. OVERVIEW TAB
---------------------------------------------------- */
function OverviewTab({ showToast, setActiveTab }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getOverview();
      setOverview(res.overview);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Dashboard Overview</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            System-wide license, device, and subscription telemetry.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>Loading metrics...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, marginBottom: 32 }}>
            <StatCard title="Total Customers" count={overview?.totalUsers || 0} icon={<Users color="#06b6d4" size={24} />} subtitle="Registered Accounts" />
            <StatCard title="Active Subscriptions" count={overview?.activeSubscriptions || 0} icon={<Shield color="#10b981" size={24} />} subtitle="Valid & Non-Expired" />
            <StatCard title="Active Windows Devices" count={overview?.activeDevices || 0} icon={<Laptop color="#3b82f6" size={24} />} subtitle="Within 2-Device Limit" />
            <StatCard title="Blocked Devices" count={overview?.blockedDevices || 0} icon={<AlertTriangle color="#f43f5e" size={24} />} subtitle="Remotely Cut Off" />
            <StatCard title="Pending Payments" count={overview?.pendingPayments || 0} icon={<CreditCard color="#f59e0b" size={24} />} subtitle="UPI Verifications Pending" highlight={overview?.pendingPayments > 0} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Laptop size={18} color="#3b82f6" /> 2-Device Slot Architecture
              </h3>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
                Each customer account is strictly capped at a maximum of <strong>2 simultaneous Windows computers</strong>.
                Slots are managed atomically in MongoDB using conditional updates to prevent race conditions during concurrent logins.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab("users")}>
                Manage Registered Devices <ChevronRight size={14} />
              </button>
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={18} color="#f59e0b" /> Pending Payment Workflow
              </h3>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
                You have <strong>{overview?.pendingPayments || 0} pending</strong> UPI payment submissions.
                Approving a payment automatically provisions the customer account, activates their subscription, and produces a single-use activation key.
              </p>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveTab("payments")}>
                View Payment Submissions <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, count, icon, subtitle, highlight }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: 20,
        borderColor: highlight ? "rgba(245, 158, 11, 0.4)" : "var(--border-color)",
        background: highlight ? "rgba(245, 158, 11, 0.05)" : "var(--bg-card)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)" }}>{title}</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>{count}</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{subtitle}</div>
        </div>
        <div style={{ padding: 10, background: "rgba(30, 41, 59, 0.7)", borderRadius: 10 }}>{icon}</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   2. USERS & DEVICES TAB (ADMIN USER MANAGEMENT)
---------------------------------------------------- */
function UsersTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Visible passwords state: { [userId]: boolean }
  const [showPasswords, setShowPasswords] = useState({});

  const togglePasswordVisibility = (id) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers({ search });
      setUsers(res.users);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const openUserDetails = async (user) => {
    setSelectedUser(user);
    setModalLoading(true);
    try {
      const res = await api.getUserDetails(user._id);
      setModalData(res);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setModalLoading(false);
    }
  };

  const handleBlockUser = async (userId) => {
    if (!confirm("Are you sure you want to block this user? All their device sessions will be revoked immediately.")) return;
    try {
      await api.blockUser(userId, "Blocked from Admin Dashboard");
      showToast("User blocked and all active sessions revoked");
      fetchUsers();
      if (selectedUser) openUserDetails(selectedUser);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await api.unblockUser(userId);
      showToast("User unblocked");
      fetchUsers();
      if (selectedUser) openUserDetails(selectedUser);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to permanently delete user '${user.username}'? This cannot be undone.`)) return;
    try {
      await api.deleteUser(user._id);
      showToast(`User '${user.username}' deleted permanently`);
      if (selectedUser?._id === user._id) setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleRevokeSessions = async (userId) => {
    try {
      const res = await api.revokeUserSessions(userId);
      showToast(res.message);
      if (selectedUser) openUserDetails(selectedUser);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleBlockDevice = async (deviceId) => {
    try {
      await api.blockDevice(deviceId, "Blocked via Admin Dashboard");
      showToast("Device blocked and slot released");
      if (selectedUser) openUserDetails(selectedUser);
      fetchUsers();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleUnblockDevice = async (deviceId) => {
    try {
      await api.unblockDevice(deviceId);
      showToast("Device unblocked");
      if (selectedUser) openUserDetails(selectedUser);
      fetchUsers();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleUnpairDevice = async (userId, deviceId) => {
    try {
      await api.unpairDevice(userId, deviceId);
      showToast("Device unpaired successfully. 1 device slot freed!");
      if (selectedUser) openUserDetails(selectedUser);
      fetchUsers();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const copyToClipboard = (text, label = "Copied") => {
    navigator.clipboard.writeText(text);
    showToast(`${label} to clipboard!`);
  };

  return (
    <div>
      {/* Header with Search and Create User button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Customers & Registered Devices</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Generate credentials, modify logins, monitor Windows installations, and unpair devices.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 240 }}>
            <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: 12, top: 12 }} />
            <input
              className="input-field"
              style={{ paddingLeft: 36 }}
              placeholder="Search username, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-outline" onClick={fetchUsers}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Generate & Create User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Login Password</th>
              <th>Lock (PIN)</th>
              <th>Status</th>
              <th>Subscription</th>
              <th>Device Slot</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-dim)" }}>
                  Loading customer accounts...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-dim)" }}>
                  No customer accounts found. Click <strong>Generate & Create User</strong> to issue new credentials.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const sub = u.currentSubscriptionId;
                const slotCount = (u.activeDeviceIds || []).length;
                const maxDevices = u.maxDevices || 2;
                const isMax = slotCount >= maxDevices;
                const isPwVisible = showPasswords[u._id];
                const passwordText = u.plainPasswordPreview || "••••••••";

                return (
                  <tr key={u._id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{u.username}</div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{u.metadata?.email || "No email attached"}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <code style={{ fontSize: 12, color: isPwVisible ? "#38bdf8" : "var(--text-dim)", fontFamily: "monospace" }}>
                          {isPwVisible ? passwordText : "••••••••"}
                        </code>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: "3px 6px" }}
                          title={isPwVisible ? "Hide Password" : "Show Password"}
                          onClick={() => togglePasswordVisibility(u._id)}
                        >
                          {isPwVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        {u.plainPasswordPreview && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ padding: "3px 6px" }}
                            title="Copy Password"
                            onClick={() => copyToClipboard(u.plainPasswordPreview, "Password copied")}
                          >
                            <Copy size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      {u.lockCode ? (
                        <span className="badge badge-pending" style={{ fontSize: 11, fontFamily: "monospace" }}>
                          PIN: {u.lockCode}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>None</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${u.status.toLowerCase()}`}>{u.status}</span>
                    </td>
                    <td>
                      {sub ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12.5 }}>{sub.plan}</div>
                          <div style={{ fontSize: 11, color: new Date(sub.expiryDate) < new Date() ? "#f43f5e" : "var(--text-dim)" }}>
                            Exp: {new Date(sub.expiryDate).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-dim)", fontSize: 12 }}>None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Laptop size={14} color={isMax ? "#f59e0b" : "#10b981"} />
                        <span style={{ fontWeight: 700, fontSize: 13 }}>
                          {slotCount} / {maxDevices}
                        </span>
                        {isMax && <span style={{ fontSize: 10, color: "#f59e0b" }}>(Full)</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          title="Edit Credentials & Limits"
                          onClick={() => setEditingUser(u)}
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          title="Manage Devices & Slots"
                          onClick={() => openUserDetails(u)}
                        >
                          <Laptop size={13} /> Devices
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: "#f43f5e" }}
                          title="Delete User"
                          onClick={() => handleDeleteUser(u)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(creds) => {
            setShowCreateModal(false);
            setCreatedCredentials(creds);
            fetchUsers();
          }}
          showToast={showToast}
        />
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={() => {
            setEditingUser(null);
            fetchUsers();
            showToast("User updated successfully");
          }}
          showToast={showToast}
        />
      )}

      {/* CREATED CREDENTIALS CARD MODAL */}
      {createdCredentials && (
        <div className="modal-overlay" onClick={() => setCreatedCredentials(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12
                }}
              >
                <CheckCircle size={28} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Account Generated Successfully!</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
                Copy and send these access credentials directly to your client.
              </p>
            </div>

            <div
              style={{
                background: "#090d16",
                border: "1px solid var(--border-color)",
                borderRadius: 10,
                padding: 16,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 13,
                lineHeight: 1.8,
                marginBottom: 20
              }}
            >
              <div><strong style={{ color: "var(--text-muted)" }}>Auth Server :</strong> <span style={{ color: "#38bdf8" }}>{createdCredentials.serverUrl}</span></div>
              <div><strong style={{ color: "var(--text-muted)" }}>Username    :</strong> <span style={{ color: "#f8fafc", fontWeight: 700 }}>{createdCredentials.username}</span></div>
              <div><strong style={{ color: "var(--text-muted)" }}>Password    :</strong> <span style={{ color: "#f8fafc", fontWeight: 700 }}>{createdCredentials.password}</span></div>
              <div><strong style={{ color: "var(--text-muted)" }}>Lock PIN    :</strong> <span style={{ color: "#fbbf24" }}>{createdCredentials.lockCode}</span></div>
              <div><strong style={{ color: "var(--text-muted)" }}>Expires At  :</strong> <span style={{ color: "#34d399" }}>{new Date(createdCredentials.expiryDate).toLocaleDateString()}</span></div>
              <div><strong style={{ color: "var(--text-muted)" }}>Max Devices :</strong> 2 Computers</div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  const formatted = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HRX BROWSER ACCESS CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server URL : ${createdCredentials.serverUrl}
Username   : ${createdCredentials.username}
Password   : ${createdCredentials.password}
Lock PIN   : ${createdCredentials.lockCode}
Expires At : ${new Date(createdCredentials.expiryDate).toLocaleDateString()}
Max Devices: 2 Computers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                  copyToClipboard(formatted, "Full credentials copied");
                }}
              >
                <Copy size={16} /> Copy Credentials for Client
              </button>
              <button className="btn btn-outline" onClick={() => setCreatedCredentials(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT & DEVICES MODAL */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Customer: {selectedUser.username}</h2>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                  Status: <span className={`badge badge-${selectedUser.status.toLowerCase()}`}>{selectedUser.status}</span> | Max Devices: {selectedUser.maxDevices || 2}
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>

            {modalLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>Loading details...</div>
            ) : modalData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Account Controls */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 14, background: "rgba(15, 23, 42, 0.7)", borderRadius: 10 }}>
                  {modalData.user.status === "BLOCKED" ? (
                    <button className="btn btn-success btn-sm" onClick={() => handleUnblockUser(modalData.user._id)}>
                      <CheckCircle size={14} /> Unblock Account
                    </button>
                  ) : (
                    <button className="btn btn-danger btn-sm" onClick={() => handleBlockUser(modalData.user._id)}>
                      <XCircle size={14} /> Suspend / Block Account
                    </button>
                  )}
                  <button className="btn btn-outline btn-sm" onClick={() => handleRevokeSessions(modalData.user._id)}>
                    <LogOut size={14} /> Remote Logout All Devices
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setSelectedUser(null);
                      setEditingUser(modalData.user);
                    }}
                  >
                    <Edit3 size={14} /> Edit Credentials
                  </button>
                </div>

                {/* Devices List */}
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <Laptop size={16} color="#3b82f6" /> Registered Windows Devices ({modalData.devices.length})
                  </h4>
                  {modalData.devices.length === 0 ? (
                    <div style={{ padding: 16, background: "rgba(30, 41, 59, 0.3)", borderRadius: 8, fontSize: 13, color: "var(--text-dim)" }}>
                      No devices have connected or registered yet. Device slots are completely free.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {modalData.devices.map((d) => (
                        <div
                          key={d._id}
                          style={{
                            padding: 14,
                            borderRadius: 10,
                            border: "1px solid var(--border-color)",
                            background: d.status === "BLOCKED" ? "rgba(244, 63, 94, 0.05)" : "rgba(15, 23, 42, 0.9)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap"
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                              {d.deviceName}
                              <span className={`badge badge-${d.status.toLowerCase()}`}>{d.status}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, fontFamily: "monospace" }}>
                              UUID: {d.installationId}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                              Last Seen: {new Date(d.lastSeenAt).toLocaleString()} ({d.lastIp || "No IP"})
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}
                              title="Free this slot so customer can use a new machine"
                              onClick={() => handleUnpairDevice(modalData.user._id, d._id)}
                            >
                              Unpair / Free Slot
                            </button>
                            {d.status === "ACTIVE" ? (
                              <button className="btn btn-danger btn-sm" onClick={() => handleBlockDevice(d._id)}>
                                Block
                              </button>
                            ) : (
                              <button className="btn btn-success btn-sm" onClick={() => handleUnblockDevice(d._id)}>
                                Unblock
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subscriptions */}
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <Shield size={16} color="#10b981" /> Subscriptions History
                  </h4>
                  {modalData.subscriptions.map((s) => (
                    <div key={s._id} style={{ padding: 12, background: "rgba(30, 41, 59, 0.3)", borderRadius: 8, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <strong>{s.plan}</strong> — <span className={`badge badge-${s.status.toLowerCase()}`}>{s.status}</span>
                      </div>
                      <div style={{ color: "var(--text-muted)" }}>
                        Expires: {new Date(s.expiryDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------
   CREATE USER MODAL
---------------------------------------------------- */
function CreateUserModal({ onClose, onCreated, showToast }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lockCode, setLockCode] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [maxDevices, setMaxDevices] = useState("2");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const generateRandomUsername = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    setUsername(`hrx_user_${num}`);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let pwd = "Hrx@";
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const generateRandomLockCode = () => {
    const code = Math.floor(100 + Math.random() * 900).toString();
    setLockCode(code);
  };

  // Pre-generate defaults on mount
  useEffect(() => {
    generateRandomUsername();
    generateRandomPassword();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createUser({
        username,
        password,
        lockCode,
        durationDays: parseInt(durationDays) || 30,
        maxDevices: parseInt(maxDevices) || 2,
        notes
      });
      showToast("Account created successfully!");
      onCreated(res.credentials);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Generate Customer Credentials</h2>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Username */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Username</label>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ padding: "2px 8px", fontSize: 11 }}
                onClick={generateRandomUsername}
              >
                <Shuffle size={12} /> Random
              </button>
            </div>
            <input
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. hrx_user_4821"
              required
            />
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Password</label>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ padding: "2px 8px", fontSize: 11 }}
                onClick={generateRandomPassword}
              >
                <Shuffle size={12} /> Random
              </button>
            </div>
            <input
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="e.g. Hrx@8392"
              required
            />
          </div>

          {/* Lock PIN */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Lock PIN (Optional 3-digit PIN)</label>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ padding: "2px 8px", fontSize: 11 }}
                onClick={generateRandomLockCode}
              >
                <Shuffle size={12} /> Random
              </button>
            </div>
            <input
              className="input-field"
              maxLength={3}
              value={lockCode}
              onChange={(e) => setLockCode(e.target.value)}
              placeholder="e.g. 786 (or leave empty)"
            />
          </div>

          {/* Plan Duration & Devices */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Duration
              </label>
              <select
                className="input-field"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              >
                <option value="30">30 Days (1 Month)</option>
                <option value="90">90 Days (3 Months)</option>
                <option value="180">180 Days (6 Months)</option>
                <option value="365">1 Year (12 Months)</option>
                <option value="3650">Lifetime (10 Years)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Max Devices
              </label>
              <select
                className="input-field"
                value={maxDevices}
                onChange={(e) => setMaxDevices(e.target.value)}
              >
                <option value="1">1 Computer</option>
                <option value="2">2 Computers (Default)</option>
                <option value="3">3 Computers</option>
                <option value="5">5 Computers</option>
              </select>
            </div>
          </div>

          {/* Customer Notes */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Customer Notes / Reference (Optional)
            </label>
            <input
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Rahul Sharma - Telegram @rahul"
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Generating Account..." : "Create Account & Show Credentials"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   EDIT USER MODAL
---------------------------------------------------- */
function EditUserModal({ user, onClose, onUpdated, showToast }) {
  const [username, setUsername] = useState(user.username || "");
  const [password, setPassword] = useState("");
  const [lockCode, setLockCode] = useState(user.lockCode || "");
  const [maxDevices, setMaxDevices] = useState(user.maxDevices?.toString() || "2");
  const [status, setStatus] = useState(user.status || "ACTIVE");
  const [extendDays, setExtendDays] = useState("0");
  const [notes, setNotes] = useState(user.metadata?.notes || "");
  const [loading, setLoading] = useState(false);

  const generateNewPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let pwd = "Hrx@";
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const generateNewLockCode = () => {
    const code = Math.floor(100 + Math.random() * 900).toString();
    setLockCode(code);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatePayload = {
        username,
        lockCode,
        maxDevices: parseInt(maxDevices) || 2,
        status,
        notes
      };
      if (password && password.trim()) {
        updatePayload.password = password.trim();
      }
      if (parseInt(extendDays) > 0) {
        updatePayload.durationDays = parseInt(extendDays);
      }

      await api.updateUser(user._id, updatePayload);
      onUpdated();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Edit Customer: {user.username}</h2>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Username */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Username
            </label>
            <input
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Change Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Reset Password <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 400 }}>(Leave blank to keep existing)</span>
              </label>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ padding: "2px 8px", fontSize: 11 }}
                onClick={generateNewPassword}
              >
                <Shuffle size={12} /> Generate
              </button>
            </div>
            <input
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={user.plainPasswordPreview ? `Current: ${user.plainPasswordPreview}` : "Enter new password..."}
            />
          </div>

          {/* Lock PIN */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Lock PIN (Optional 3-digit PIN)
              </label>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ padding: "2px 8px", fontSize: 11 }}
                onClick={generateNewLockCode}
              >
                <Shuffle size={12} /> Generate
              </button>
            </div>
            <input
              className="input-field"
              maxLength={3}
              value={lockCode}
              onChange={(e) => setLockCode(e.target.value)}
              placeholder="e.g. 786"
            />
          </div>

          {/* Max Devices & Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Max Devices
              </label>
              <select
                className="input-field"
                value={maxDevices}
                onChange={(e) => setMaxDevices(e.target.value)}
              >
                <option value="1">1 Computer</option>
                <option value="2">2 Computers</option>
                <option value="3">3 Computers</option>
                <option value="5">5 Computers</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Account Status
              </label>
              <select
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </div>
          </div>

          {/* Extend Subscription */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Extend Subscription Duration
            </label>
            <select
              className="input-field"
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
            >
              <option value="0">Do Not Extend (Keep Current Expiry)</option>
              <option value="30">+30 Days (1 Month)</option>
              <option value="90">+90 Days (3 Months)</option>
              <option value="180">+180 Days (6 Months)</option>
              <option value="365">+1 Year (12 Months)</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Notes
            </label>
            <input
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Saving Changes..." : "Save Changes"}
            </button>
            <button className="btn btn-outline" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   3. UPI PAYMENTS TAB
---------------------------------------------------- */
function PaymentsTab({ showToast }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.getPayments({ status: statusFilter });
      setPayments(res.payments);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleApprove = async (paymentId) => {
    try {
      const res = await api.approvePayment(paymentId);
      showToast("Payment approved! Account and activation key generated.");
      setCreatedCredentials(res.data);
      fetchPayments();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleReject = async (paymentId) => {
    const reason = prompt("Enter rejection reason (e.g. UTR not found in bank statement):");
    if (!reason) return;
    try {
      await api.rejectPayment(paymentId, reason);
      showToast("Payment rejected");
      fetchPayments();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>UPI Payment Submissions</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Verify customer transaction reference (UTR) and auto-generate customer activation keys.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select
            className="input-field"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All Payments</option>
          </select>
          <button className="btn btn-outline" onClick={fetchPayments}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>UTR / Reference</th>
              <th>Customer</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Submitted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-dim)" }}>
                  Loading payment submissions...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-dim)" }}>
                  No payment submissions found with status: {statusFilter || "ANY"}
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#38bdf8" }}>{p.utr}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.customerName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{p.customerEmail}</div>
                    {p.customerPhone && <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{p.customerPhone}</div>}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700 }}>{p.requestedPlan}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: "#34d399" }}>₹{p.amount}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td>
                    {p.status === "PENDING" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(p._id)}>
                          Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(p._id)}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                        {p.status === "APPROVED" ? `By ${p.processedBy?.username || "Admin"}` : p.rejectionReason}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generated Credentials Success Modal */}
      {createdCredentials && (
        <div className="modal-overlay" onClick={() => setCreatedCredentials(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12
                }}
              >
                <CheckCircle size={32} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Payment Approved & Account Provisioned!</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
                Deliver these credentials to the customer to activate their desktop software.
              </p>
            </div>

            <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: 18, borderRadius: 10, border: "1px solid var(--border-color)", marginBottom: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase" }}>Username</span>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{createdCredentials.user.username}</div>
              </div>

              {createdCredentials.activationKey && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase" }}>One-Time Activation Key</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8", fontFamily: "monospace", letterSpacing: 1 }}>
                    {createdCredentials.activationKey}
                  </div>
                </div>
              )}

              <div>
                <span style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase" }}>Subscription Plan</span>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {createdCredentials.subscription.plan} (Expires: {new Date(createdCredentials.subscription.expiryDate).toLocaleDateString()})
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  const text = `LicenseVault Credentials:\nUsername: ${createdCredentials.user.username}\nActivation Key: ${createdCredentials.activationKey}\nPlan: ${createdCredentials.subscription.plan}`;
                  navigator.clipboard.writeText(text);
                  showToast("Credentials copied to clipboard!");
                }}
              >
                <Copy size={16} /> Copy Credentials
              </button>
              <button className="btn btn-outline" onClick={() => setCreatedCredentials(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------
   4. SECURITY AUDIT LOGS TAB
---------------------------------------------------- */
function AuditLogsTab({ showToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs();
      setLogs(res.logs);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Security Audit Logs</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Immutable trail of administrative and security actions.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchLogs}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Details</th>
              <th>IP</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-dim)" }}>
                  Loading security audit trail...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-dim)" }}>
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l._id}>
                  <td>
                    <span style={{ fontWeight: 700, fontFamily: "monospace", color: "#38bdf8", fontSize: 12 }}>
                      {l.action}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-pending">{l.actorType}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {l.targetType || "—"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-dim)" }}>
                      {JSON.stringify(l.details || {})}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{l.ip || "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   5. SETTINGS TAB
---------------------------------------------------- */
function SettingsTab({ apiBaseUrl, onSave }) {
  const [url, setUrl] = useState(apiBaseUrl);

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Server Settings</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
        Configure the backend API server the dashboard communicates with.
      </p>

      <div className="glass-card" style={{ padding: 24 }}>
        <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
          Backend API Base URL
        </label>
        <input
          className="input-field"
          style={{ marginBottom: 12 }}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setUrl("https://kk-auth.vercel.app/api")}
          >
            Use kk-auth Vercel API
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setUrl("https://premium-license-server.onrender.com/api")}
          >
            Use Render Cloud API
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setUrl("http://localhost:8000/api")}
          >
            Use Localhost (Port 8000)
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => onSave(url)}>
          Save Endpoint
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   LOGIN VIEW
---------------------------------------------------- */
function LoginView({ onLoginSuccess, apiBaseUrl, setApiBaseUrl, showToast }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@123456");
  const [loading, setLoading] = useState(false);
  const [endpoint, setEndpoint] = useState(apiBaseUrl);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      setApiBase(endpoint);
      setApiBaseUrl(endpoint);

      const res = await api.login(username, password);
      storeAuth(res.token, res.admin);
      onLoginSuccess(res.token, res.admin);
      showToast("Signed in successfully!");
    } catch (err) {
      showToast(err.message || "Failed to authenticate", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "radial-gradient(circle at 50% 20%, #1e293b 0%, #090d16 100%)"
      }}
    >
      <div className="glass-card" style={{ maxWidth: 420, width: "100%", padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #0284c7, #3b82f6)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14
            }}
          >
            <Shield size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>LicenseVault Admin</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Control panel for subscriptions & device blocking
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Username or Email
            </label>
            <input
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>
              Target API Endpoint
            </label>
            <input
              className="input-field"
              style={{ fontSize: 12 }}
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Authenticating..." : "Sign In to Admin Dashboard"}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 11.5, color: "var(--text-dim)" }}>
          Default seeded admin: <code>admin</code> / <code>Admin@123456</code>
        </div>
      </div>
    </div>
  );
}

