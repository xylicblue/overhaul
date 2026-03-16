import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./creatclient";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";

const TYPE_OPTIONS = ["info", "announcement", "warning"];

const TYPE_STYLES = {
  info:         "bg-blue-500/10 text-blue-300 border-blue-500/20",
  warning:      "bg-amber-500/10 text-amber-300 border-amber-500/20",
  announcement: "bg-purple-500/10 text-purple-300 border-purple-500/20",
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminNotifications() {
  const [notifications, setNotifications]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [posting, setPosting]               = useState(false);
  const [isAdmin, setIsAdmin]               = useState(null); // null = checking
  const [form, setForm] = useState({ title: "", message: "", type: "info", expires_at: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Check admin status ──────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();
      setIsAdmin(data?.is_admin === true);
    };
    check();
  }, []);

  // ── Fetch all notifications (admins see all including inactive) ──────────
  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Post new notification ────────────────────────────────────────────────
  const handlePost = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.title.trim() || !form.message.trim()) {
      setError("Title and message are required."); return;
    }
    setPosting(true);
    const payload = {
      title:   form.title.trim(),
      message: form.message.trim(),
      type:    form.type,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    const { error: err } = await supabase.from("notifications").insert(payload);
    if (err) {
      setError(err.message);
    } else {
      setSuccess("Notification posted successfully!");
      setForm({ title: "", message: "", type: "info", expires_at: "" });
      fetchAll();
      setTimeout(() => setSuccess(""), 3000);
    }
    setPosting(false);
  };

  // ── Toggle active ────────────────────────────────────────────────────────
  const toggleActive = async (n) => {
    await supabase.from("notifications").update({ is_active: !n.is_active }).eq("id", n.id);
    fetchAll();
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteNotif = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    await supabase.from("notifications").delete().eq("id", id);
    fetchAll();
  };

  // ── Guard: not admin ─────────────────────────────────────────────────────
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-center">
        <div>
          <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-zinc-400 text-sm">You must be an admin to access this page.</p>
          <Link to="/" className="mt-6 inline-block text-blue-400 hover:text-blue-300 text-sm">← Back to Home</Link>
        </div>
      </div>
    );
  }

  if (isAdmin === null) {
    return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#050505]/90 backdrop-blur-md border-b border-zinc-800 flex items-center px-6 justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoImage} alt="ByteStrike" className="h-7 w-auto" />
        </Link>
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Bell size={12} />
          Admin — Notifications
        </span>
        <Link to="/trade" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← Back to App
        </Link>
      </header>

      <main className="pt-24 pb-20 px-6 max-w-4xl mx-auto">

        {/* ── Post new notification ─────────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Plus size={15} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Post New Notification</h2>
          </div>

          <form onSubmit={handlePost} className="flex flex-col gap-4">
            {/* Title */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Scheduled Maintenance Tonight"
                maxLength={120}
                className="w-full bg-zinc-900/60 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Message *</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Brief update for all users..."
                rows={3}
                maxLength={500}
                className="w-full bg-zinc-900/60 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
              />
            </div>

            {/* Type + Expiry row */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1.5">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full bg-zinc-900/60 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1.5">Expires At (optional)</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                  className="w-full bg-zinc-900/60 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Feedback */}
            {error   && <p className="text-red-400 text-xs">{error}</p>}
            {success && <p className="text-emerald-400 text-xs">{success}</p>}

            <button
              type="submit"
              disabled={posting}
              className="self-end px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {posting ? <span className="w-4 h-4 rounded-full border-2 border-blue-300 border-t-transparent animate-spin inline-block" /> : <Plus size={14} />}
              Post Notification
            </button>
          </form>
        </div>

        {/* ── Existing notifications ──────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            All Notifications ({notifications.length})
          </h2>

          {loading ? (
            <div className="py-16 text-center"><div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-blue-500 animate-spin mx-auto" /></div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-zinc-600 text-sm">No notifications posted yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-4 items-start p-4 rounded-xl border transition-all ${
                    n.is_active
                      ? "border-white/[0.07] bg-white/[0.02]"
                      : "border-white/[0.03] bg-white/[0.01] opacity-50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${TYPE_STYLES[n.type] || TYPE_STYLES.info}`}>
                        {n.type}
                      </span>
                      {!n.is_active && <span className="text-[10px] text-zinc-600 font-medium">INACTIVE</span>}
                      <span className="text-[10px] text-zinc-600 ml-auto">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-200">{n.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{n.message}</p>
                    {n.expires_at && (
                      <p className="text-[10px] text-zinc-700 mt-1">
                        Expires: {new Date(n.expires_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(n)}
                      title={n.is_active ? "Deactivate" : "Activate"}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all"
                    >
                      {n.is_active ? <ToggleRight size={16} className="text-blue-400" /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      onClick={() => deleteNotif(n.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
