import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./creatclient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  User,
  Settings as SettingsIcon,
  Shield,
  Bell,
  BellOff,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  X,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import BokehBackground from "./components/BokehBackground";
import { HiOutlineHome } from "react-icons/hi2";
import { Link } from "react-router-dom";
import logo from "./assets/ByteStrikeLogoFinal.png";

// ── Notification type meta ────────────────────────────────────────────────────
const NOTIF_TYPES = [
  { key: "info",         label: "Info",         desc: "General platform updates and announcements.",       color: "text-blue-400",   bg: "bg-blue-500/10",   hover: "group-hover:bg-blue-500/20"   },
  { key: "announcement", label: "Announcement", desc: "Major product launches and important milestones.",  color: "text-purple-400", bg: "bg-purple-500/10", hover: "group-hover:bg-purple-500/20" },
  { key: "warning",      label: "Warning",      desc: "Maintenance windows, incidents, and risk notices.", color: "text-amber-400",  bg: "bg-amber-500/10",  hover: "group-hover:bg-amber-500/20"  },
];

// ── NotificationSettings (sub-component for the notifications tab) ────────────
const NotificationSettings = ({ session }) => {
  const DEFAULT_PREFS = { enabled: true, types: ["info", "announcement", "warning"] };
  const [prefs, setPrefs]       = useState(DEFAULT_PREFS);
  const [saving, setSaving]     = useState(false);
  const [loaded, setLoaded]     = useState(false);

  // Load from profiles
  useEffect(() => {
    const load = async () => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("broadcast_notification_prefs")
        .eq("id", session.user.id)
        .single();
      if (data?.broadcast_notification_prefs) setPrefs(data.broadcast_notification_prefs);
      setLoaded(true);
    };
    load();
  }, [session]);

  // Persist to Supabase
  const save = async (newPrefs) => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ broadcast_notification_prefs: newPrefs })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) toast.error("Failed to save preferences");
    else toast.success("Notification preferences saved");
  };

  const toggleEnabled = () => {
    const next = { ...prefs, enabled: !prefs.enabled };
    setPrefs(next);
    save(next);
  };

  const toggleType = (typeKey) => {
    const has = prefs.types.includes(typeKey);
    const nextTypes = has
      ? prefs.types.filter((t) => t !== typeKey)
      : [...prefs.types, typeKey];
    const next = { ...prefs, types: nextTypes };
    setPrefs(next);
    save(next);
  };

  if (!loaded) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-line border-t-blue-500 animate-spin" />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h3 className="text-xl font-bold mb-6 text-ink">Notification Preferences</h3>

      {/* Master switch */}
      <div className="bg-surface-1 backdrop-blur-md border border-line-subtle rounded-2xl overflow-hidden">
        <div
          className="p-5 flex items-center justify-between hover:bg-surface-2/50 transition-colors cursor-pointer group"
          onClick={toggleEnabled}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl transition-colors ${
              prefs.enabled ? "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20" : "bg-surface-3 text-ink-faint"
            }`}>
              {prefs.enabled ? <Bell size={20} /> : <BellOff size={20} />}
            </div>
            <div>
              <h4 className="font-bold text-ink text-sm">Platform Notifications</h4>
              <p className="text-xs text-ink-faint mt-0.5">
                {prefs.enabled ? "You will receive in-app notifications from the admin team." : "All notifications are muted. The bell icon will be dimmed."}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {prefs.enabled
              ? <ToggleRight size={32} className="text-blue-500" />
              : <ToggleLeft  size={32} className="text-ink-faint" />}
          </div>
        </div>
      </div>

      {/* Per-type toggles */}
      <div>
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-3 px-1">
          Notification Types
        </p>
        <div className="bg-surface-1 backdrop-blur-md border border-line-subtle rounded-2xl overflow-hidden divide-y divide-line-subtle">
          {NOTIF_TYPES.map((t) => {
            const active = prefs.types.includes(t.key);
            const disabled = !prefs.enabled;
            return (
              <div
                key={t.key}
                onClick={() => !disabled && toggleType(t.key)}
                className={`p-5 flex items-center justify-between transition-colors group ${
                  disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-surface-2/50 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl transition-colors ${t.bg} ${t.color} ${!disabled ? t.hover : ""}`}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink text-sm">{t.label}</h4>
                    <p className="text-xs text-ink-faint mt-0.5">{t.desc}</p>
                  </div>
                </div>
                <div className="shrink-0">
                  {active
                    ? <ToggleRight size={32} className="text-blue-500" />
                    : <ToggleLeft  size={32} className="text-ink-faint" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {saving && (
        <p className="text-xs text-ink-faint flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border border-line border-t-blue-500 animate-spin" />
          Saving...
        </p>
      )}
    </motion.div>
  );
};

const SettingsPage = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const navigate = useNavigate();

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Mock Settings State
  const [settings, setSettings] = useState({
    reduceMotion: false,
    highContrast: false,
    emailAlerts: true,
    priceAlerts: false,
    twoFactor: false,
  });

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      if (!session) navigate("/login");
    };
    getSession();
  }, [navigate]);

  useEffect(() => {
    const getProfile = async () => {
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    getProfile();
  }, [session]);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success(
      `${key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())} updated`
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password changed successfully!");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "preferences", label: "Preferences", icon: SettingsIcon },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-ink shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                {profile?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-ink mb-1">
                  {profile?.username || "User"}
                </h2>
                <p className="text-ink-muted text-sm mb-3">{session?.user?.email}</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wide">
                  {profile?.kyc_status?.replace("_", " ").toUpperCase() ||
                    "NOT VERIFIED"}
                </div>
              </div>
            </div>

            <div className="bg-surface-1 backdrop-blur-md border border-line-subtle rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-6 text-ink flex items-center gap-2">
                <User size={20} className="text-blue-500" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink-faint uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    value={profile?.username || ""}
                    disabled
                    className="w-full bg-surface-0 border border-line rounded-xl px-4 py-3 text-ink-muted focus:outline-none cursor-not-allowed opacity-70 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink-faint uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value={session?.user?.email || ""}
                    disabled
                    className="w-full bg-surface-0 border border-line rounded-xl px-4 py-3 text-ink-muted focus:outline-none cursor-not-allowed opacity-70 font-medium"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-ink-faint uppercase tracking-wider">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    value={profile?.wallet_address || "Not Connected"}
                    disabled
                    className="w-full bg-surface-0 border border-line rounded-xl px-4 py-3 text-ink-muted focus:outline-none cursor-not-allowed opacity-70 num text-sm"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      case "preferences":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-bold mb-6 text-ink">
              App Preferences
            </h3>
            <div className="bg-surface-1 backdrop-blur-md border border-line-subtle rounded-2xl overflow-hidden divide-y divide-line-subtle">
              <div className="p-5 flex items-center justify-between hover:bg-surface-2/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                    <Moon size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink text-sm">Dark Mode</h4>
                    <p className="text-xs text-ink-faint mt-0.5">
                      Always on for ByteStrike
                    </p>
                  </div>
                </div>
                <div className="opacity-50 cursor-not-allowed">
                  <ToggleRight size={32} className="text-blue-600" />
                </div>
              </div>

              <div
                className="p-5 flex items-center justify-between hover:bg-surface-2/50 transition-colors cursor-pointer group"
                onClick={() => handleToggle("reduceMotion")}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                    <SettingsIcon size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink text-sm">
                      Reduce Motion
                    </h4>
                    <p className="text-xs text-ink-faint mt-0.5">
                      Minimize animations for performance
                    </p>
                  </div>
                </div>
                <div className="text-ink-faint group-hover:text-ink-muted transition-colors">
                  {settings.reduceMotion ? (
                    <ToggleRight size={32} className="text-blue-600" />
                  ) : (
                    <ToggleLeft size={32} />
                  )}
                </div>
              </div>

              <div
                className="p-5 flex items-center justify-between hover:bg-surface-2/50 transition-colors cursor-pointer group"
                onClick={() => handleToggle("highContrast")}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                    <Sun size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink text-sm">
                      High Contrast
                    </h4>
                    <p className="text-xs text-ink-faint mt-0.5">
                      Increase visibility of interface elements
                    </p>
                  </div>
                </div>
                <div className="text-ink-faint group-hover:text-ink-muted transition-colors">
                  {settings.highContrast ? (
                    <ToggleRight size={32} className="text-blue-600" />
                  ) : (
                    <ToggleLeft size={32} />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      case "security":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-bold mb-6 text-ink">
              Security Settings
            </h3>

            <div className="bg-surface-1 backdrop-blur-md border border-line-subtle rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-0 border border-line-subtle">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink text-sm">
                      Two-Factor Authentication
                    </h4>
                    <p className="text-xs text-ink-faint mt-0.5">
                      Add an extra layer of security
                    </p>
                  </div>
                </div>
                <div
                  className="cursor-pointer text-ink-faint hover:text-ink-muted transition-colors"
                  onClick={() => handleToggle("twoFactor")}
                >
                  {settings.twoFactor ? (
                    <ToggleRight size={32} className="text-green-500" />
                  ) : (
                    <ToggleLeft size={32} />
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-line-subtle">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full py-3.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink font-semibold transition-colors border border-line hover:border-line-strong flex items-center justify-center gap-2 text-sm"
                >
                  <Lock size={16} />
                  Change Password
                </button>
              </div>
            </div>

            <div className="bg-red-500/5 rounded-2xl border border-red-500/10 p-6">
              <h4 className="font-bold text-red-400 mb-2 text-sm uppercase tracking-wide">Danger Zone</h4>
              <p className="text-xs text-ink-muted mb-4 leading-relaxed">
                Once you delete your account, there is no going back. Please be
                certain.
              </p>
              <button className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold border border-red-500/20 transition-colors">
                Delete Account
              </button>
            </div>
          </motion.div>
        );
      case "notifications":
        return (
          <NotificationSettings session={session} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 text-ink p-6 md:p-12 relative overflow-hidden">
      {/* Background Visual */}
      <BokehBackground className="absolute inset-0 z-0 opacity-40 fixed" />
      <div className="absolute inset-0 bg-gradient-to-b from-surface-0 via-transparent to-surface-0 pointer-events-none z-0" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header with Home Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2 tracking-tight">
                Settings
                </h1>
                <p className="text-ink-muted font-medium">
                Manage your account settings and preferences.
                </p>
            </div>
            
             <Link 
                to="/" 
                className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-full bg-surface-1 border border-line text-ink-muted hover:text-ink hover:border-line-strong transition-colors text-sm font-semibold"
              >
                <HiOutlineHome className="w-4 h-4" />
                <span>Back to Home</span>
            </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-72 flex-shrink-0">
            <div className="bg-surface-1 backdrop-blur-xl border border-line-subtle rounded-2xl p-4 space-y-2 sticky top-24 shadow-2xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-150 relative group ${
                    activeTab === tab.id
                      ? "bg-surface-3 text-ink"
                      : "text-ink-faint hover:text-ink hover:bg-surface-2"
                  }`}
                >
                  <tab.icon size={18} className={activeTab === tab.id ? "text-blue-400" : "text-ink-faint group-hover:text-ink-muted transition-colors"} />
                  {tab.label}
                  {activeTab === tab.id && (
                    <ChevronRight size={16} className="ml-auto text-blue-400" />
                  )}
                </button>
              ))}

              <div className="h-px bg-line my-4 mx-2"></div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="min-h-[500px]">
              <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-1 border border-line rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
             <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600" />
              
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-ink tracking-tight">
                  Change Password
                </h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-2 rounded-full hover:bg-surface-3 text-ink-muted hover:text-ink transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-5">
                {/* New Password */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative group">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-surface-2 border border-line rounded-xl px-4 py-3.5 pr-12 text-ink placeholder-ink-ghost focus:outline-none focus:border-blue-500/60 transition-colors duration-150"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted transition-colors"
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-surface-2 border border-line rounded-xl px-4 py-3.5 pr-12 text-ink placeholder-ink-ghost focus:outline-none focus:border-blue-500/60 transition-colors duration-150"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password mismatch warning */}
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-400 text-xs font-medium bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">Passwords don't match</p>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-3.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-muted font-semibold transition-colors border border-line"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isChangingPassword ||
                      !newPassword ||
                      !confirmPassword ||
                      newPassword !== confirmPassword
                    }
                    className="flex-1 py-3.5 rounded-xl bg-ink hover:brightness-95 text-surface-0 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
