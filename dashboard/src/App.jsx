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
  Settings
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
   2. USERS & DEVICES TAB
---------------------------------------------------- */
function UsersTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Customers & Registered Devices</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Monitor Windows installations, device slots, and execute remote blocks.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ position: "relative", width: 260 }}>
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
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Status</th>
              <th>Subscription</th>
              <th>Device Slot Usage</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-dim)" }}>
                  Loading customer accounts...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-dim)" }}>
                  No customer accounts found matching search.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const sub = u.currentSubscriptionId;
                const slotCount = (u.activeDeviceIds || []).length;
                const isMax = slotCount >= (u.maxDevices || 2);

                return (
                  <tr key={u._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.username}</div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{u.metadata?.email || "No email"}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${u.status.toLowerCase()}`}>{u.status}</span>
                    </td>
                    <td>
                      {sub ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12.5 }}>{sub.plan}</div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
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
                        <span style={{ fontWeight: 700 }}>
                          {slotCount} / {u.maxDevices || 2}
                        </span>
                        {isMax && <span style={{ fontSize: 10, color: "#f59e0b" }}>(Max)</span>}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => openUserDetails(u)}>
                        Inspect & Manage
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Customer: {selectedUser.username}</h2>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>ID: {selectedUser._id}</div>
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
                </div>

                {/* Devices List */}
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <Laptop size={16} color="#3b82f6" /> Registered Windows Devices ({modalData.devices.length})
                  </h4>
                  {modalData.devices.length === 0 ? (
                    <div style={{ padding: 16, background: "rgba(30, 41, 59, 0.3)", borderRadius: 8, fontSize: 13, color: "var(--text-dim)" }}>
                      No devices have connected or registered yet.
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
                            alignItems: "center"
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
                          <div>
                            {d.status === "ACTIVE" ? (
                              <button className="btn btn-danger btn-sm" onClick={() => handleBlockDevice(d._id)}>
                                Block Device
                              </button>
                            ) : (
                              <button className="btn btn-success btn-sm" onClick={() => handleUnblockDevice(d._id)}>
                                Unblock Device
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
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
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
