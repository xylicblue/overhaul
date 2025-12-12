import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./creatclient";
import toast from "react-hot-toast";
import {
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
} from "react-icons/hi2";
import AuthLayout from "./components/AuthLayout";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid session from the reset link
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        // Give it a moment - the hash might still be processing
        setTimeout(async () => {
          const {
            data: { session: retrySession },
          } = await supabase.auth.getSession();
          if (!retrySession) {
            setSessionError(true);
          }
        }, 1000);
      }
    };
    checkSession();
  }, []);

  const validatePassword = (pwd) => {
    const minLength = pwd.length >= 8;
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasLowercase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    return {
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      isValid: minLength && hasUppercase && hasLowercase && hasNumber,
    };
  };

  const validation = validatePassword(password);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!validation.isValid) {
      toast.error("Password does not meet requirements");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setResetSuccess(true);
      toast.success("Password updated successfully!");

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionError) {
    return (
      <AuthLayout
        title="Link Expired"
        subtitle="This password reset link is no longer valid."
      >
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
            <span className="text-4xl mb-4 block">⚠️</span>
            <p className="text-red-400 font-medium mb-2">
              Invalid or Expired Link
            </p>
            <p className="text-zinc-400 text-sm">
              This password reset link has expired or is invalid. Please request
              a new password reset link.
            </p>
          </div>

          <Link
            to="/forgot-password"
            className="w-full py-4 px-6 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition-all duration-300 text-sm flex items-center justify-center"
          >
            Request New Reset Link
          </Link>

          <Link
            to="/login"
            className="flex items-center justify-center text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (resetSuccess) {
    return (
      <AuthLayout
        title="Password Reset!"
        subtitle="Your password has been successfully updated."
      >
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
            <HiOutlineCheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-green-400 font-medium mb-2">Success!</p>
            <p className="text-zinc-400 text-sm">
              Your password has been updated. You will be redirected to the
              login page shortly.
            </p>
          </div>

          <Link
            to="/login"
            className="w-full py-4 px-6 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition-all duration-300 text-sm flex items-center justify-center"
          >
            Sign In Now
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Create a new secure password for your account."
    >
      <form onSubmit={handleResetPassword} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-xs font-bold text-zinc-400 uppercase tracking-wider"
          >
            New Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <HiOutlineLockClosed className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full pl-11 pr-11 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 text-sm"
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

        {/* Password Requirements */}
        {password && (
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <HiOutlineShieldCheck className="w-4 h-4" />
              Password Requirements
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                className={`flex items-center gap-2 ${
                  validation.minLength ? "text-green-400" : "text-zinc-500"
                }`}
              >
                <span>{validation.minLength ? "✓" : "○"}</span>
                <span>8+ characters</span>
              </div>
              <div
                className={`flex items-center gap-2 ${
                  validation.hasUppercase ? "text-green-400" : "text-zinc-500"
                }`}
              >
                <span>{validation.hasUppercase ? "✓" : "○"}</span>
                <span>Uppercase letter</span>
              </div>
              <div
                className={`flex items-center gap-2 ${
                  validation.hasLowercase ? "text-green-400" : "text-zinc-500"
                }`}
              >
                <span>{validation.hasLowercase ? "✓" : "○"}</span>
                <span>Lowercase letter</span>
              </div>
              <div
                className={`flex items-center gap-2 ${
                  validation.hasNumber ? "text-green-400" : "text-zinc-500"
                }`}
              >
                <span>{validation.hasNumber ? "✓" : "○"}</span>
                <span>Number</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="text-xs font-bold text-zinc-400 uppercase tracking-wider"
          >
            Confirm New Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <HiOutlineLockClosed className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="block w-full pl-11 pr-11 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 text-sm"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <HiOutlineEyeSlash className="h-5 w-5" />
              ) : (
                <HiOutlineEye className="h-5 w-5" />
              )}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
          )}
          {confirmPassword &&
            password === confirmPassword &&
            password.length > 0 && (
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                <HiOutlineCheckCircle className="w-3 h-3" />
                Passwords match
              </p>
            )}
        </div>

        <button
          type="submit"
          disabled={
            loading || !validation.isValid || password !== confirmPassword
          }
          className="w-full py-4 px-6 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
        >
          {loading ? (
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
              Updating Password...
            </span>
          ) : (
            "Reset Password"
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
