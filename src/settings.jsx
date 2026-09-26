import React, { useState, useEffect } from "react";
import MfaSettings from "./components/MfaSettings";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { supabase } from "./creatclient";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  User,
  Settings as SettingsIcon,
  Shield,
  Bell,
  Mail,
  Smartphone,
  LogOut,
  X,
  Eye,
  EyeOff,
  Lock,
  Trash2,
} from "lucide-react";
import { HiOutlineHome } from "react-icons/hi2";
import { Link } from "react-router-dom";

// ── Switch ────────────────────────────────────────────────────────────────────
// Standard track + sliding-knob toggle. Presentational: the parent row owns the
// click, so this reflects state and stays in sync with the existing handlers.
const Switch = ({ checked, disabled = false }) => (
  <span
    role="switch"
    aria-checked={checked}
    aria-disabled={disabled || undefined}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
      checked ? "bg-[#0a84ff]" : "bg-[#3a3a3c]"
    } ${disabled ? "opacity-60" : ""}`}
  >
    <span
      className={`h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-transform duration-200 ${
        checked ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </span>
);

// ── Notification type meta ────────────────────────────────────────────────────
const NOTIF_TYPES = [
  { key: "info", label: "Info", desc: "General platform updates and announcements." },
  { key: "announcement", label: "Announcements", desc: "Major product launches and important milestones." },
  { key: "warning", label: "Warnings", desc: "Maintenance windows, incidents and risk notices." },
];

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
};

const RiskAlertSettings = ({ session }) => {
  const [wallet, setWallet] = useState("");
  const [emailAddress, setEmailAddress] = useState(session?.user?.email || "");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const pushSupported = typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!session?.user?.id) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", session.user.id)
        .single();
      const normalizedWallet = profile?.wallet_address?.toLowerCase() || "";
      if (!active) return;
      setWallet(normalizedWallet);
      if (normalizedWallet) {
        const { data } = await supabase
          .from("notification_preferences")
          .select("email_enabled,email_address,push_enabled")
          .eq("user_id", normalizedWallet)
          .maybeSingle();
        if (active && data) {
          setEmailEnabled(Boolean(data.email_enabled));
          setEmailAddress(data.email_address || session.user.email || "");
          setPushEnabled(Boolean(data.push_enabled));
        }
      }
      if (active) setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [session]);

  const savePreferences = async (patch) => {
    if (!wallet) {
      toast.error("Connect the approved entity wallet before enabling margin alerts.");
      return false;
    }
    const { error } = await supabase.from("notification_preferences").upsert({
      user_id: wallet,
      cat_margin_enabled: true,
      cat_liquidation_enabled: true,
      ...patch,
    }, { onConflict: "user_id" });
    if (error) {
      toast.error("Could not save margin alert preferences.");
      return false;
    }
    return true;
  };

  const saveEmail = async (nextEnabled = emailEnabled) => {
    if (nextEnabled && !/^\S+@\S+\.\S+$/.test(emailAddress.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSaving(true);
    const saved = await savePreferences({
      email_enabled: nextEnabled,
      email_address: emailAddress.trim() || null,
    });
    setSaving(false);
    if (saved) {
      setEmailEnabled(nextEnabled);
      toast.success(nextEnabled ? "Email margin alerts enabled" : "Email margin alerts disabled");
    }
  };

  const togglePush = async () => {
    if (!pushSupported) {
      toast.error("Browser push is not supported on this device.");
      return;
    }
    setSaving(true);
    try {
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!pushEnabled) {
        if (!publicKey) throw new Error("Browser push is not configured for this deployment.");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Notification permission was not granted.");
      }
      const registration = await navigator.serviceWorker.register("/push-notification-sw.js");
      const existing = await registration.pushManager.getSubscription();
      if (pushEnabled) {
        const saved = await savePreferences({ push_enabled: false, push_subscription: null });
        if (saved) {
          if (existing) await existing.unsubscribe();
          setPushEnabled(false);
          toast.success("Browser margin alerts disabled");
        }
        return;
      }

      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const saved = await savePreferences({
        push_enabled: true,
        push_subscription: subscription.toJSON(),
      });
      if (saved) {
        setPushEnabled(true);
        toast.success("Browser margin alerts enabled");
      }
    } catch (error) {
      toast.error(error.message || "Could not enable browser margin alerts.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
    </div>
  );

  return (
    <section>
      <div className="mb-3 px-1">
        <p className="text-xs font-medium text-ink-faint">Margin and liquidation alerts</p>
        <p className="mt-1 text-xs leading-5 text-zinc-600">
          Critical in-app notices are always retained. Add optional channels for faster delivery.
        </p>
      </div>
      <div className="divide-y divide-white/[0.07] overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#121216]">
        <div className="flex items-center justify-between gap-6 px-6 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <Bell size={17} className="mt-0.5 text-[#0a84ff]" />
            <div>
              <h3 className="text-base font-medium text-ink">In-app risk alerts</h3>
              <p className="mt-1 text-sm leading-5 text-ink-faint">Warnings, recoveries and confirmed liquidation notices.</p>
            </div>
          </div>
          <Switch checked disabled />
        </div>

        <div className="px-6 py-5 sm:px-7">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-start gap-3">
              <Mail size={17} className="mt-0.5 text-zinc-400" />
              <div>
                <h3 className="text-base font-medium text-ink">Email alerts</h3>
                <p className="mt-1 text-sm leading-5 text-ink-faint">Send risk notices to a monitored address.</p>
              </div>
            </div>
            <button type="button" onClick={() => void saveEmail(!emailEnabled)} disabled={saving}>
              <Switch checked={emailEnabled} disabled={saving} />
            </button>
          </div>
          <div className="mt-4 flex gap-2 pl-8">
            <input
              type="email"
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
              placeholder="risk@example.com"
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-[#0a84ff]/60"
            />
            {emailEnabled && (
              <button
                type="button"
                onClick={() => void saveEmail(true)}
                disabled={saving}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-opacity disabled:opacity-50"
              >
                Save
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-6 px-6 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <Smartphone size={17} className="mt-0.5 text-zinc-400" />
            <div>
              <h3 className="text-base font-medium text-ink">Browser push</h3>
              <p className="mt-1 text-sm leading-5 text-ink-faint">
                {pushSupported ? "Receive urgent alerts even when ByteStrike is not open." : "Not supported by this browser."}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => void togglePush()} disabled={saving || !pushSupported}>
            <Switch checked={pushEnabled} disabled={saving || !pushSupported} />
          </button>
        </div>
      </div>
      {!wallet && (
        <p className="mt-3 px-1 text-xs text-amber-400/80">Connect the approved entity wallet to configure delivery channels.</p>
      )}
    </section>
  );
};

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
    <div className="flex items-center justify-center py-24">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
    </div>
  );

  return (
    <Motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-9"
    >
      <div>
        <h2 className="text-[30px] font-semibold tracking-[-0.025em] text-ink">Notifications</h2>
        <p className="mt-2 text-[15px] text-ink-faint">Choose which platform updates appear in your account.</p>
      </div>

      {/* Master switch */}
      <section className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#121216]">
        <div
          className="flex cursor-pointer items-center justify-between gap-8 px-6 py-5 transition-colors hover:bg-white/[0.025] sm:px-7"
          onClick={toggleEnabled}
        >
          <div>
            <h3 className="text-base font-medium text-ink">Platform notifications</h3>
            <p className="mt-1 text-sm leading-5 text-ink-faint">
              {prefs.enabled ? "Receive in-app updates from the ByteStrike team." : "All platform notifications are currently muted."}
            </p>
          </div>
          <Switch checked={prefs.enabled} />
        </div>
      </section>

      {/* Per-type toggles */}
      <section>
        <p className="mb-2.5 px-1 text-xs font-medium text-ink-faint">
          Notification types
        </p>
        <div className="divide-y divide-white/[0.07] overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#121216]">
          {NOTIF_TYPES.map((t) => {
            const active = prefs.types.includes(t.key);
            const disabled = !prefs.enabled;
            return (
              <div
                key={t.key}
                onClick={() => !disabled && toggleType(t.key)}
                className={`flex items-center justify-between gap-8 px-6 py-5 transition-colors sm:px-7 ${
                  disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-white/[0.025]"
                }`}
              >
                <div>
                  <h3 className="text-base font-medium text-ink">{t.label}</h3>
                  <p className="mt-1 text-sm leading-5 text-ink-faint">{t.desc}</p>
                </div>
                <Switch checked={active} disabled={disabled} />
              </div>
            );
          })}
        </div>
      </section>

      <RiskAlertSettings session={session} />

      {saving && (
        <p className="flex items-center gap-2 px-1 text-xs text-ink-faint">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white/15 border-t-white/70" />
          Saving...
        </p>
      )}
    </Motion.div>
  );
};

const SettingsPage = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  // Deep-linkable tabs, e.g. /settings?tab=security (used by the 2FA nudge banner).
  const [searchParams] = useSearchParams();
  const VALID_TABS = ["profile", "preferences", "security", "notifications"];
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(VALID_TABS.includes(requestedTab) ? requestedTab : "profile");
  const navigate = useNavigate();

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">Profile</h2>
              <p className="mt-1.5 text-sm text-ink-faint">Your ByteStrike account information.</p>
            </div>

            <section className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#121216]">
              <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2c2c2e] text-xl font-semibold text-white">
                {profile?.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[17px] font-semibold text-ink">
                    {profile?.username || "User"}
                  </h3>
                  <p className="mt-0.5 truncate text-[13px] text-ink-faint">{session?.user?.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.07] px-3 py-1.5 text-[11px] font-medium text-ink-muted">
                  {profile?.kyc_status?.replaceAll("_", " ") || "Not verified"}
                </span>
              </div>
            </section>

            <section>
              <p className="mb-2.5 px-1 text-xs font-medium text-ink-faint">Personal information</p>
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.07] sm:grid-cols-2">
                <div className="bg-[#121216] px-5 py-4">
                  <label className="mb-2 block text-xs text-ink-faint">
                    Username
                  </label>
                  <input
                    type="text"
                    value={profile?.username || ""}
                    disabled
                    className="w-full cursor-not-allowed bg-transparent text-[15px] font-medium text-ink outline-none"
                  />
                </div>
                <div className="bg-[#121216] px-5 py-4">
                  <label className="mb-2 block text-xs text-ink-faint">
                    Email
                  </label>
                  <input
                    type="email"
                    value={session?.user?.email || ""}
                    disabled
                    className="w-full cursor-not-allowed bg-transparent text-[15px] font-medium text-ink outline-none"
                  />
                </div>
                <div className="bg-[#121216] px-5 py-4 sm:col-span-2">
                  <label className="mb-2 block text-xs text-ink-faint">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    value={profile?.wallet_address || "Not Connected"}
                    disabled
                    className="num w-full cursor-not-allowed bg-transparent text-[13px] text-ink-muted outline-none"
                  />
                </div>
              </div>
            </section>
          </Motion.div>
        );
      case "preferences":
        return (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">Preferences</h2>
              <p className="mt-1.5 text-sm text-ink-faint">Adjust how ByteStrike looks and feels.</p>
            </div>
            <section>
              <p className="mb-2.5 px-1 text-xs font-medium text-ink-faint">Appearance</p>
              <div className="divide-y divide-white/[0.07] overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#121216]">
              <div className="flex items-center justify-between gap-6 px-5 py-[18px]">
                <div>
                  <h3 className="text-[15px] font-medium text-ink">Dark mode</h3>
                  <p className="mt-1 text-[13px] text-ink-faint">Always on for ByteStrike.</p>
                </div>
                <div className="shrink-0 cursor-not-allowed" title="Dark mode is always enabled">
                  <Switch checked disabled />
                </div>
              </div>

              <div
                className="flex cursor-pointer items-center justify-between gap-6 px-5 py-[18px] transition-colors hover:bg-white/[0.025]"
                onClick={() => handleToggle("reduceMotion")}
              >
                <div>
                  <h3 className="text-[15px] font-medium text-ink">Reduce motion</h3>
                  <p className="mt-1 text-[13px] text-ink-faint">Minimize interface animations.</p>
                </div>
                <Switch checked={settings.reduceMotion} />
              </div>

              <div
                className="flex cursor-pointer items-center justify-between gap-6 px-5 py-[18px] transition-colors hover:bg-white/[0.025]"
                onClick={() => handleToggle("highContrast")}
              >
                <div>
                  <h3 className="text-[15px] font-medium text-ink">High contrast</h3>
                  <p className="mt-1 text-[13px] text-ink-faint">Increase the visibility of interface elements.</p>
                </div>
                <Switch checked={settings.highContrast} />
              </div>
            </div>
            </section>
          </Motion.div>
        );
      case "security":
        return (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">Security</h2>
              <p className="mt-1.5 text-sm text-ink-faint">Manage sign-in protection and account access.</p>
            </div>

            {/* Two-factor authentication (live) */}
            <section>
              <p className="mb-2.5 px-1 text-xs font-medium text-ink-faint">Authentication</p>
              <MfaSettings />
            </section>

            <section className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#121216]">
              <div className="flex flex-col gap-4 px-5 py-[18px] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-[15px] font-medium text-ink">Password</h3>
                  <p className="mt-1 text-[13px] leading-5 text-ink-faint">Choose a strong, unique password for your account.</p>
                </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white/[0.08] px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-white/[0.12]"
              >
                <Lock size={14} />
                Change Password
              </button>
              </div>
            </section>

            <section>
              <p className="mb-2.5 px-1 text-xs font-medium text-ink-faint">Account</p>
              <div className="overflow-hidden rounded-[18px] border border-red-500/15 bg-[#121216]">
                <div className="flex flex-col gap-4 px-5 py-[18px] sm:flex-row sm:items-center sm:justify-between">
                  <div className="sm:max-w-md">
                    <h3 className="text-[15px] font-medium text-ink">Delete account</h3>
                    <p className="mt-1 text-[13px] leading-5 text-ink-faint">
                      Permanently delete your account and all associated data. This cannot be undone.
                  </p>
                </div>
                  <button className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/10">
                  <Trash2 size={14} />
                  Delete Account
                </button>
              </div>
              </div>
            </section>
          </Motion.div>
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
    <div className="min-h-screen bg-[#08080a] text-ink">
      <header className="border-b border-white/[0.07]">
        <div className="mx-auto flex h-16 max-w-[1040px] items-center justify-between px-5 sm:px-8">
          <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">Settings</h1>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-faint transition-colors hover:bg-white/[0.06] hover:text-ink"
          >
            <HiOutlineHome className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1040px] px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-10 md:flex-row md:gap-16">
          {/* Sidebar */}
          <aside className="w-full shrink-0 md:w-52">
            <nav className="flex gap-1 overflow-x-auto pb-1 md:sticky md:top-8 md:flex-col md:overflow-visible">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors md:w-full ${
                    activeTab === tab.id
                      ? "bg-white/[0.09] text-ink"
                      : "text-ink-faint hover:bg-white/[0.045] hover:text-ink-muted"
                  }`}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                >
                  <tab.icon size={16} strokeWidth={1.8} />
                  {tab.label}
                </button>
              ))}

              <div className="mx-2 my-2 hidden h-px bg-white/[0.07] md:block" />

              <button
                onClick={handleLogout}
                className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink-faint transition-colors hover:bg-white/[0.045] hover:text-red-400 md:w-full"
              >
                <LogOut size={16} strokeWidth={1.8} />
                Sign out
              </button>
            </nav>
          </aside>

          {/* Content Area */}
          <div className="min-w-0 flex-1">
            <div className="min-h-[520px]">
              <AnimatePresence mode="wait">
                <Motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderContent()}
                </Motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setShowPasswordModal(false)}
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[420px] overflow-hidden rounded-[20px] border border-white/[0.1] bg-[#1c1c1e] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:p-7"
            >
              <div className="mb-7 flex items-center justify-between">
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-ink">
                  Change Password
                </h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-full bg-white/[0.07] p-1.5 text-ink-faint transition-colors hover:bg-white/[0.12] hover:text-ink"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-ink-muted">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full rounded-xl border border-white/[0.1] bg-black/20 px-3.5 py-3 pr-11 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-ghost focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink-muted"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
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
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-ink-muted">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full rounded-xl border border-white/[0.1] bg-black/20 px-3.5 py-3 pr-11 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-ghost focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink-muted"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
                  <p className="text-xs text-red-400">Passwords don't match.</p>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 rounded-xl bg-white/[0.08] py-3 text-[14px] font-medium text-ink transition-colors hover:bg-white/[0.12]"
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
                    className="flex-1 rounded-xl bg-[#0a84ff] py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#3096ff] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
