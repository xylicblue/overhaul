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

/* ── Shared input class ── */
const inputCls =
  "block w-full bg-white/[0.02] border border-white/[0.07] rounded-md py-2 text-[13px] text-white placeholder-zinc-700 focus:outline-none focus:border-white/[0.22] transition-colors duration-150";

/* ── Shared label class ── */
const labelCls = "block text-[11px] font-medium text-zinc-500 mb-1";

// ─────────────────────────────────────────────────────────────────────────────
// Login Form
// ─────────────────────────────────────────────────────────────────────────────
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
        options: { redirectTo: `${window.location.origin}/welcome` },
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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
    toast.promise(supabase.auth.resend({ type: "signup", email }), {
      loading: "Sending confirmation email...",
      success: "Confirmation email sent! Please check your inbox.",
      error: (err) => `Error: ${err.message}`,
    });
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {/* Email */}
      <div>
        <label className={labelCls}>Email</label>
        <div className="relative">
          <HiOutlineEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`${inputCls} pl-9 pr-3`}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={`${labelCls} mb-0`}>Password</label>
          <Link
            to="/forgot-password"
            onClick={onClose}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={`${inputCls} pl-9 pr-9`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors duration-150"
          >
            {showPassword ? <HiOutlineEyeSlash className="h-4 w-4" /> : <HiOutlineEye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-md bg-red-500/[0.07] border border-red-500/[0.15] text-red-400 text-[12px]">
          {error}
        </div>
      )}

      {/* Email not confirmed */}
      {emailNotConfirmed && (
        <div className="px-3 py-2 rounded-md bg-amber-500/[0.07] border border-amber-500/[0.15] text-amber-400 text-[12px] space-y-1">
          <div>Email not confirmed. Please check your inbox.</div>
          <button
            type="button"
            onClick={handleResendConfirmation}
            className="text-amber-300 hover:text-amber-200 underline text-[11px]"
          >
            Resend confirmation email
          </button>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-md bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-[13px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      {/* Divider */}
      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.06]" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-[#0a0a10] text-zinc-600 text-[10px] uppercase tracking-[0.12em]">or</span>
        </div>
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={signInWithGoogle}
        className="w-full py-2 px-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.12] text-zinc-300 hover:text-white rounded-md transition-colors duration-150 flex items-center justify-center gap-2.5 text-[12px] font-medium"
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      {/* Wallet */}
      <WalletAuthButtons
        variant="compact"
        onSuccess={onClose}
        onNewUser={() => { onClose(); navigate("/welcome"); }}
      />

      {/* Switch mode */}
      <p className="text-center text-zinc-600 text-[12px] pt-1">
        No account?{" "}
        <button type="button" onClick={onSwitchMode} className="text-zinc-300 hover:text-white font-medium transition-colors duration-150">
          Create one
        </button>
      </p>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Signup Form
// ─────────────────────────────────────────────────────────────────────────────
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
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (!allRequirementsMet) { setError("Please meet all password requirements"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/welcome` },
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
      <div className="py-8 space-y-3 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-500/[0.08] border border-emerald-500/[0.20] flex items-center justify-center mx-auto">
          <HiCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-white">Check your email</h3>
          <p className="text-[12px] text-zinc-500 mt-1">
            Confirmation link sent to <span className="text-zinc-300">{email}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-zinc-300 hover:text-white rounded-md text-[12px] font-medium transition-colors duration-150"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      {/* Email */}
      <div>
        <label className={labelCls}>Email</label>
        <div className="relative">
          <HiOutlineEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`${inputCls} pl-9 pr-3`}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className={labelCls}>Password</label>
        <div className="relative">
          <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={`${inputCls} pl-9 pr-9`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors duration-150"
          >
            {showPassword ? <HiOutlineEyeSlash className="h-4 w-4" /> : <HiOutlineEye className="h-4 w-4" />}
          </button>
        </div>
        {/* Password requirements */}
        {password && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {[
              { key: "length",    text: "8+ characters" },
              { key: "uppercase", text: "Uppercase"     },
              { key: "lowercase", text: "Lowercase"     },
              { key: "number",    text: "Number"        },
            ].map(({ key, text }) => (
              <div
                key={key}
                className={`flex items-center gap-1.5 text-[10px] ${
                  passwordRequirements[key] ? "text-emerald-400" : "text-zinc-600"
                }`}
              >
                <HiCheck className="w-3 h-3 shrink-0" />
                {text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className={labelCls}>Confirm password</label>
        <div className="relative">
          <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
          <input
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={`${inputCls} pl-9 pr-3`}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-md bg-red-500/[0.07] border border-red-500/[0.15] text-red-400 text-[12px]">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-md bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-[13px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>

      {/* Divider */}
      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.06]" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-[#0a0a10] text-zinc-600 text-[10px] uppercase tracking-[0.12em]">or use wallet</span>
        </div>
      </div>

      {/* Wallet */}
      <WalletAuthButtons
        variant="compact"
        onSuccess={onClose}
        onNewUser={() => { onClose(); navigate("/welcome"); }}
      />

      {/* Switch mode */}
      <p className="text-center text-zinc-600 text-[12px] pt-1">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchMode} className="text-zinc-300 hover:text-white font-medium transition-colors duration-150">
          Sign in
        </button>
      </p>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth Modal
// ─────────────────────────────────────────────────────────────────────────────
const AuthModal = () => {
  const { isOpen, mode, close, switchMode } = useAuthModal();

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === "Escape") close(); };
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-[400px] bg-[#0a0a10] border border-white/[0.08] rounded-lg p-6 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-5">
                <img src={logo} alt="ByteStrike" className="h-5 w-auto" />
                <button
                  onClick={close}
                  className="p-1.5 rounded-md hover:bg-white/[0.04] text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
                >
                  <HiXMark className="w-4 h-4" />
                </button>
              </div>

              {/* Title */}
              <div className="mb-5">
                <h2 className="text-[17px] font-semibold text-white tracking-[-0.01em]">
                  {mode === "login" ? "Sign in" : "Create account"}
                </h2>
                <p className="text-[12px] text-zinc-500 mt-0.5">
                  {mode === "login"
                    ? "Access your ByteStrike account"
                    : "Get started with ByteStrike"}
                </p>
              </div>

              {/* Form */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
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
