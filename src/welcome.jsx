import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./creatclient";
import AuthLayout from "./components/AuthLayout";
import toast from "react-hot-toast";
import { HiOutlineUser } from "react-icons/hi2";

const CreateUsernamePage = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        setError(error.message);
      } else if (profile && profile.username) {
        navigate("/");
      } else {
        setLoading(false);
      }
    };
    checkProfile();
  }, [navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, username }, { onConflict: "id" });

      if (updateError) throw updateError;

      toast.success("Profile completed successfully!");
      navigate("/");
    } catch (error) {
      if (
        error.message.includes("duplicate key value violates unique constraint")
      ) {
        setError("This username is already taken. Please choose another.");
      } else {
        setError(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#050505]">
        <svg
          className="animate-spin h-8 w-8 text-zinc-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  return (
    <AuthLayout
      title="Complete Your Profile"
      subtitle="Welcome! Choose a unique username to get started."
    >
      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="username"
            className="text-xs font-bold text-zinc-400 uppercase tracking-wider"
          >
            Username
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <HiOutlineUser className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="text"
              id="username"
              placeholder="Choose a unique username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength="3"
              required
              className="block w-full pl-11 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 text-sm"
            />
          </div>
          {username.length > 0 && username.length < 3 && (
            <p className="text-xs text-zinc-500 ml-1">
              Must be at least 3 characters
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-start gap-3">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || username.length < 3}
          className="w-full py-4 px-6 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-black"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving...
            </span>
          ) : (
            "Continue"
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default CreateUsernamePage;
