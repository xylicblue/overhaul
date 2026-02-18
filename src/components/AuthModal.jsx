import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../creatclient";
import toast from "react-hot-toast";
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineUser,
  HiXMark,
  HiCheck,
} from "react-icons/hi2";
import { useAuthModal } from "../context/AuthModalContext";
import logo from "../assets/ByteStrikeLogoFinal.png";
import WalletAuthButtons from "./WalletAuthButtons";

// Login Form Component
const LoginForm = ({ onSwitchMode, onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/welcome`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setEmailNotConfirmed(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      onClose();
      toast.success("Welcome back!");
    } catch (error) {
      if (error.message.includes("Email not confirmed")) {
        setEmailNotConfirmed(true);
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error("Please enter the email you signed up with first.");
      return;
    }

    const resendPromise = supabase.auth.resend({
      type: "signup",
      email: email,
    });

    toast.promise(resendPromise, {
      loading: "Sending confirmation email...",
      success: "Confirmation email sent! Please check your inbox.",
      error: (err) => `Error: ${err.message}`,
    });
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Email Address
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <HiOutlineEnvelope className="h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
          </div>
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="block w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Password
          </label>
          <Link
            to="/forgot-password"
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <HiOutlineLockClosed className="h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="block w-full pl-11 pr-11 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all text-sm"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <HiOutlineEyeSlash className="h-5 w-5" />
            ) : (
              <HiOutlineEye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {emailNotConfirmed && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm space-y-1">
          <div>Email not confirmed. Please check your inbox.</div>
          <button
            type="button"
            onClick={handleResendConfirmation}
            className="text-amber-300 hover:text-amber-200 underline text-xs"
          >
            Resend confirmation email
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-6 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {loading ? "Signing In..." : "Sign In"}
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="px-4 bg-[#0a0a0a] text-zinc-500">Or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        className="w-full py-3 px-4 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 text-sm"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Google
      </button>

      <WalletAuthButtons variant="compact" onSuccess={onClose} onNewUser={() => { onClose(); navigate("/welcome"); }} />

      <p className="text-center text-zinc-500 text-sm pt-2">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-white hover:underline font-bold"
        >
          Create account
        </button>
      </p>
    </form>
  );
};

// Signup Form Component
const SignupForm = ({ onSwitchMode, onClose }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!allRequirementsMet) {
      setError("Please meet all password requirements");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/welcome`,
        },
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
          <HiCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Check your email</h3>
        <p className="text-zinc-400 text-sm">
          We've sent a confirmation link to <strong>{email}</strong>
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Email Address
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <HiOutlineEnvelope className="h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
          </div>
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="block w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Password
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <HiOutlineLockClosed className="h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="block w-full pl-11 pr-11 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all text-sm"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <HiOutlineEyeSlash className="h-5 w-5" />
            ) : (
              <HiOutlineEye className="h-5 w-5" />
            )}
          </button>
        </div>
        {/* Password requirements */}
        {password && (
          <div className="grid grid-cols-2 gap-1 mt-2">
            {[
              { key: "length", text: "8+ characters" },
              { key: "uppercase", text: "Uppercase" },
              { key: "lowercase", text: "Lowercase" },
              { key: "number", text: "Number" },
            ].map(({ key, text }) => (
              <div
                key={key}
                className={`flex items-center gap-1.5 text-xs ${
                  passwordRequirements[key] ? "text-emerald-400" : "text-zinc-500"
                }`}
              >
                <HiCheck className="w-3 h-3" />
                {text}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Confirm Password
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <HiOutlineLockClosed className="h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
          </div>
          <input
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="block w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-6 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {loading ? "Creating Account..." : "Create Account"}
      </button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="px-4 bg-[#0a0a0a] text-zinc-500">Or use wallet</span>
        </div>
      </div>

      <WalletAuthButtons variant="compact" onSuccess={onClose} onNewUser={() => { onClose(); navigate("/welcome"); }} />

      <p className="text-center text-zinc-500 text-sm pt-2">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-white hover:underline font-bold"
        >
          Sign in
        </button>
      </p>
    </form>
  );
};

// Main Auth Modal Component
const AuthModal = () => {
  const { isOpen, mode, close, switchMode } = useAuthModal();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") close();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-md bg-[#0a0a0a] border border-zinc-800 rounded-2xl shadow-2xl p-6 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <img src={logo} alt="ByteStrike" className="h-7" />
                <button
                  onClick={close}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <HiXMark className="w-5 h-5" />
                </button>
              </div>

              {/* Title */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {mode === "login" ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="text-zinc-400 text-sm mt-1">
                  {mode === "login"
                    ? "Sign in to access your portfolio"
                    : "Join ByteStrike and start trading"}
                </p>
              </div>

              {/* Form */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {mode === "login" ? (
                    <LoginForm onSwitchMode={switchMode} onClose={close} />
                  ) : (
                    <SignupForm onSwitchMode={switchMode} onClose={close} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
