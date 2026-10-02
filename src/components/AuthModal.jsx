import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
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
  "block h-12 w-full rounded-[14px] border border-white/[0.09] bg-white/[0.045] text-[14px] text-white placeholder:text-zinc-600 outline-none transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.06] focus:border-[#0a84ff]/70 focus:bg-white/[0.065] focus:ring-4 focus:ring-[#0a84ff]/10";

/* ── Shared label class ── */
const labelCls = "mb-2 block text-[12px] font-medium tracking-[-0.01em] text-zinc-400";

// ─────────────────────────────────────────────────────────────────────────────
// PrivacyCheckbox — explicit Privacy Policy acknowledgement.
// Required before any account-creation path (email signup, Google OAuth, wallet).
// Controlled component; links open in a new tab so the user keeps their place.
// ─────────────────────────────────────────────────────────────────────────────
const PrivacyCheckbox = ({ checked, onChange, id = "privacy" }) => (
  <label
    htmlFor={id}
    className="group flex cursor-pointer select-none items-start gap-3 rounded-[14px] border border-transparent px-1 py-0.5 focus-within:border-white/[0.08]"
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only"
    />
    <span
      className={`mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-all duration-200 ${
        checked
          ? "border-[#0a84ff] bg-[#0a84ff] shadow-[0_0_0_3px_rgba(10,132,255,0.12)]"
          : "border-white/[0.20] bg-white/[0.035] group-hover:border-white/[0.34]"
      }`}
    >
      {checked && <HiCheck className="h-3.5 w-3.5 text-white" />}
    </span>
    <span className="text-[11.5px] leading-[1.55] text-zinc-400">
      I have read and acknowledge ByteStrike Group's{" "}
      <a
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-zinc-200 underline decoration-white/25 underline-offset-2 transition-colors duration-150 hover:text-white hover:decoration-white/60"
      >
        Privacy Policy
      </a>.
    </span>
  </label>
);

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
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const signInWithGoogle = async () => {
    if (!agreed) return; // OAuth can onboard new users — require privacy acknowledgement first
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/welcome?next=${encodeURIComponent(location.pathname)}`,
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
    <form onSubmit={handleLogin} className="space-y-[18px]">
      {/* Email */}
      <div>
        <label className={labelCls}>Email</label>
        <div className="relative">
          <HiOutlineEnvelope className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500" />
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={`${inputCls} pl-12 pr-4`}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={`${labelCls} mb-0`}>Password</label>
          <Link
            to="/forgot-password"
            onClick={onClose}
            className="text-[11.5px] font-medium text-[#75baff] transition-colors duration-150 hover:text-[#a8d2ff]"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <HiOutlineLockClosed className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={`${inputCls} pl-12 pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition-colors duration-150 hover:bg-white/[0.06] hover:text-zinc-200"
          >
            {showPassword ? <HiOutlineEyeSlash className="h-4 w-4" /> : <HiOutlineEye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-[14px] border border-red-400/[0.18] bg-red-500/[0.08] px-3.5 py-3 text-[12px] leading-relaxed text-red-300">
          {error}
        </div>
      )}

      {/* Email not confirmed */}
      {emailNotConfirmed && (
        <div className="space-y-1.5 rounded-[14px] border border-amber-400/[0.18] bg-amber-500/[0.08] px-3.5 py-3 text-[12px] leading-relaxed text-amber-200">
          <div>Email not confirmed. Please check your inbox.</div>
          <button
            type="button"
            onClick={handleResendConfirmation}
            className="text-[11.5px] font-medium text-amber-200 underline decoration-amber-200/30 underline-offset-2 hover:text-white"
          >
            Resend confirmation email
          </button>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-[14px] bg-[#0a84ff] text-[14px] font-semibold text-white shadow-[0_10px_30px_rgba(10,132,255,0.24)] transition-all duration-200 hover:bg-[#2492ff] hover:shadow-[0_12px_34px_rgba(10,132,255,0.30)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      {/* Divider */}
      <div className="relative py-0.5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.08]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#101014] px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">or continue with</span>
        </div>
      </div>

      {/* Privacy acknowledgement — required for Google / wallet (these can create a new account) */}
      <PrivacyCheckbox checked={agreed} onChange={setAgreed} id="login-privacy" />

      {/* Google */}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={!agreed}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[13px] border border-white/[0.10] bg-white/[0.045] px-3 text-[12.5px] font-medium text-zinc-200 transition-all duration-200 hover:border-white/[0.17] hover:bg-white/[0.075] hover:text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/[0.10] disabled:hover:bg-white/[0.045]"
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      {/* Wallet — also gated behind privacy acknowledgement */}
      <WalletAuthButtons
        variant="compact"
        disabled={!agreed}
        onSuccess={onClose}
        onNewUser={() => { onClose(); navigate(`/welcome?next=${encodeURIComponent(location.pathname)}`); }}
      />
      {!agreed && (
        <p className="-mt-1 text-center text-[10.5px] leading-relaxed text-zinc-600">Acknowledge the Privacy Policy to continue with Google or wallet</p>
      )}

      {/* Switch mode */}
      <p className="pt-0.5 text-center text-[12px] text-zinc-500">
        No account?{" "}
        <button type="button" onClick={onSwitchMode} className="font-semibold text-[#75baff] transition-colors duration-150 hover:text-[#a8d2ff]">
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
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);

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
    if (!agreed) { setError("Please acknowledge the Privacy Policy to continue"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/welcome`,
          // Record the affirmative privacy acknowledgement in the user's metadata.
          data: { privacy_acknowledged_at: new Date().toISOString() },
        },
      });
      if (error) throw error;
      if (data.session) {
        onClose();
        navigate(`/welcome?next=${encodeURIComponent(location.pathname)}`);
        return;
      }
      setSuccess(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-5 py-9 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/[0.22] bg-emerald-400/[0.10] shadow-[0_0_0_8px_rgba(52,211,153,0.04)]">
          <HiCheck className="h-6 w-6 text-emerald-300" />
        </div>
        <div>
          <h3 className="text-[20px] font-semibold tracking-[-0.025em] text-white">Check your email</h3>
          <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">
            Confirmation link sent to <span className="font-medium text-zinc-300">{email}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="h-11 rounded-[13px] border border-white/[0.10] bg-white/[0.05] px-6 text-[12.5px] font-medium text-zinc-200 transition-all duration-200 hover:border-white/[0.17] hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} className="space-y-[18px]">
      {/* Email */}
      <div>
        <label className={labelCls}>Email</label>
        <div className="relative">
          <HiOutlineEnvelope className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500" />
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={`${inputCls} pl-12 pr-4`}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className={labelCls}>Password</label>
        <div className="relative">
          <HiOutlineLockClosed className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={`${inputCls} pl-12 pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition-colors duration-150 hover:bg-white/[0.06] hover:text-zinc-200"
          >
            {showPassword ? <HiOutlineEyeSlash className="h-4 w-4" /> : <HiOutlineEye className="h-4 w-4" />}
          </button>
        </div>
        {/* Password requirements */}
        {password && (
          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-[12px] border border-white/[0.06] bg-black/10 px-3 py-2.5">
            {[
              { key: "length",    text: "8+ characters" },
              { key: "uppercase", text: "Uppercase"     },
              { key: "lowercase", text: "Lowercase"     },
              { key: "number",    text: "Number"        },
            ].map(({ key, text }) => (
              <div
                key={key}
                className={`flex items-center gap-1.5 text-[10.5px] transition-colors duration-150 ${
                  passwordRequirements[key] ? "text-emerald-300" : "text-zinc-600"
                }`}
              >
                <HiCheck className="h-3 w-3 shrink-0" />
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
          <HiOutlineLockClosed className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500" />
          <input
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={`${inputCls} pl-12 pr-4`}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-[14px] border border-red-400/[0.18] bg-red-500/[0.08] px-3.5 py-3 text-[12px] leading-relaxed text-red-300">
          {error}
        </div>
      )}

      {/* Privacy acknowledgement — required to create an account */}
      <PrivacyCheckbox checked={agreed} onChange={setAgreed} id="signup-privacy" />

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !agreed}
        className="h-12 w-full rounded-[14px] bg-[#0a84ff] text-[14px] font-semibold text-white shadow-[0_10px_30px_rgba(10,132,255,0.24)] transition-all duration-200 hover:bg-[#2492ff] hover:shadow-[0_12px_34px_rgba(10,132,255,0.30)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      {/* Divider */}
      <div className="relative py-0.5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.08]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#101014] px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">or continue with wallet</span>
        </div>
      </div>

      {/* Wallet — also gated behind privacy acknowledgement */}
      <WalletAuthButtons
        variant="compact"
        disabled={!agreed}
        onSuccess={onClose}
        onNewUser={() => { onClose(); navigate(`/welcome?next=${encodeURIComponent(location.pathname)}`); }}
      />
      {!agreed && (
        <p className="-mt-1 text-center text-[10.5px] leading-relaxed text-zinc-600">Acknowledge the Privacy Policy above to continue</p>
      )}

      {/* Switch mode */}
      <p className="pt-0.5 text-center text-[12px] text-zinc-500">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchMode} className="font-semibold text-[#75baff] transition-colors duration-150 hover:text-[#a8d2ff]">
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
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md"
            onClick={close}
          />

          {/* Modal */}
          <Motion.div
            initial={{ opacity: 0, scale: 0.975, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center p-3 sm:p-6"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-modal-title"
              className="pointer-events-auto relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-[28px] border border-white/[0.11] bg-[linear-gradient(180deg,rgba(24,24,29,0.985)_0%,rgba(13,13,17,0.995)_42%,rgba(10,10,13,1)_100%)] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.72),0_1px_0_rgba(255,255,255,0.05)_inset] sm:max-h-[calc(100dvh-3rem)] sm:p-7"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-x-12 top-0 h-24 rounded-full bg-[#0a84ff]/[0.07] blur-3xl" />

              {/* Header row */}
              <div className="relative mb-7 flex items-center justify-between">
                <img src={logo} alt="ByteStrike" className="h-6 w-auto" />
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close authentication dialog"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.04] text-zinc-500 transition-all duration-200 hover:border-white/[0.13] hover:bg-white/[0.08] hover:text-white active:scale-95"
                >
                  <HiXMark className="h-[17px] w-[17px]" />
                </button>
              </div>

              {/* Title */}
              <div className="relative mb-7">
                <h2 id="auth-modal-title" className="text-[26px] font-semibold leading-tight tracking-[-0.035em] text-white">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="mt-2 max-w-[340px] text-[13px] leading-relaxed text-zinc-500">
                  {mode === "login"
                    ? "Sign in to securely access your ByteStrike account."
                    : "Set up secure access to the ByteStrike platform."}
                </p>
              </div>

              {/* Form */}
              <AnimatePresence mode="wait">
                <Motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === "login" ? -6 : 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "login" ? 6 : -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  {mode === "login" ? (
                    <LoginForm onSwitchMode={switchMode} onClose={close} />
                  ) : (
                    <SignupForm onSwitchMode={switchMode} onClose={close} />
                  )}
                </Motion.div>
              </AnimatePresence>
            </div>
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
