import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "./creatclient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  User,
  Settings as SettingsIcon,
  Shield,
  Bell,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

const SettingsPage = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const navigate = useNavigate();

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
      const { data: { session } } = await supabase.auth.getSession();
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
    toast.success(`${key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} updated`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-blue-500/20">
                {profile?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{profile?.username || "User"}</h2>
                <p className="text-slate-400">{session?.user?.email}</p>
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                  {profile?.kyc_status?.replace("_", " ").toUpperCase() || "NOT VERIFIED"}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-semibold mb-4 text-slate-200">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Username</label>
                  <input
                    type="text"
                    value={profile?.username || ""}
                    disabled
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-300 focus:outline-none cursor-not-allowed opacity-70"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Email</label>
                  <input
                    type="email"
                    value={session?.user?.email || ""}
                    disabled
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-300 focus:outline-none cursor-not-allowed opacity-70"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Wallet Address</label>
                  <input
                    type="text"
                    value={profile?.wallet_address || "Not Connected"}
                    disabled
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-300 focus:outline-none cursor-not-allowed opacity-70 font-mono text-sm"
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
            className="space-y-4"
          >
            <h3 className="text-xl font-bold mb-6 text-white">App Preferences</h3>
            <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Moon size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-200">Dark Mode</h4>
                    <p className="text-sm text-slate-500">Always on for ByteStrike</p>
                  </div>
                </div>
                <div className="opacity-50 cursor-not-allowed">
                  <ToggleRight size={32} className="text-blue-500" />
                </div>
              </div>
              
              <div className="p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => handleToggle("reduceMotion")}>
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <SettingsIcon size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-200">Reduce Motion</h4>
                    <p className="text-sm text-slate-500">Minimize animations for performance</p>
                  </div>
                </div>
                <div>
                  {settings.reduceMotion ? (
                    <ToggleRight size={32} className="text-blue-500" />
                  ) : (
                    <ToggleLeft size={32} className="text-slate-600" />
                  )}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer" onClick={() => handleToggle("highContrast")}>
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Sun size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-200">High Contrast</h4>
                    <p className="text-sm text-slate-500">Increase visibility of interface elements</p>
                  </div>
                </div>
                <div>
                  {settings.highContrast ? (
                    <ToggleRight size={32} className="text-blue-500" />
                  ) : (
                    <ToggleLeft size={32} className="text-slate-600" />
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
            <h3 className="text-xl font-bold mb-6 text-white">Security Settings</h3>
            
            <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-200">Two-Factor Authentication</h4>
                    <p className="text-sm text-slate-500">Add an extra layer of security</p>
                  </div>
                </div>
                <div className="cursor-pointer" onClick={() => handleToggle("twoFactor")}>
                  {settings.twoFactor ? (
                    <ToggleRight size={32} className="text-green-500" />
                  ) : (
                    <ToggleLeft size={32} className="text-slate-600" />
                  )}
                </div>
              </div>
              
              <button className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors border border-slate-700">
                Change Password
              </button>
            </div>

            <div className="bg-red-500/5 rounded-2xl border border-red-500/10 p-6">
              <h4 className="font-medium text-red-400 mb-2">Danger Zone</h4>
              <p className="text-sm text-slate-400 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
              <button className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium border border-red-500/20 transition-colors">
                Delete Account
              </button>
            </div>
          </motion.div>
        );
      case "notifications":
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-bold mb-6 text-white">Notification Preferences</h3>
            <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => handleToggle("emailAlerts")}>
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-200">Email Alerts</h4>
                    <p className="text-sm text-slate-500">Receive updates about your account</p>
                  </div>
                </div>
                <div>
                  {settings.emailAlerts ? (
                    <ToggleRight size={32} className="text-blue-500" />
                  ) : (
                    <ToggleLeft size={32} className="text-slate-600" />
                  )}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer" onClick={() => handleToggle("priceAlerts")}>
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-200">Price Alerts</h4>
                    <p className="text-sm text-slate-500">Get notified when prices change significantly</p>
                  </div>
                </div>
                <div>
                  {settings.priceAlerts ? (
                    <ToggleRight size={32} className="text-blue-500" />
                  ) : (
                    <ToggleLeft size={32} className="text-slate-600" />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400 mb-8">Manage your account settings and preferences.</p>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-2 sticky top-24">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                  {activeTab === tab.id && <ChevronRight size={16} className="ml-auto opacity-50" />}
                </button>
              ))}
              
              <div className="h-px bg-white/5 my-4"></div>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-slate-900/30 backdrop-blur-sm border border-white/5 rounded-3xl p-6 md:p-8 min-h-[500px]">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
