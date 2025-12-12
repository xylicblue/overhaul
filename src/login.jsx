import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./creatclient";
import toast from "react-hot-toast";
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
} from "react-icons/hi2";
import AuthLayout from "./components/AuthLayout";

const LoginPage = () => {
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
      navigate("/"); // Redirect to homepage on successful login
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
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to access your portfolio and trade."
    >
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-xs font-bold text-zinc-400 uppercase tracking-wider"
          >
            Email Address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <HiOutlineEnvelope className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="email"
              id="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full pl-11 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-bold text-zinc-400 uppercase tracking-wider"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </div>
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

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-start gap-3">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {emailNotConfirmed && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium space-y-2">
            <div className="flex items-start gap-3">
              <span className="mt-0.5">⚠️</span>
              <span>Email not confirmed. Please check your inbox.</span>
            </div>
            <button
              type="button"
              onClick={handleResendConfirmation}
              className="text-amber-300 hover:text-amber-200 underline decoration-amber-300/30 underline-offset-2 ml-7"
            >
              Resend confirmation email
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
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
              Signing In...
            </span>
          ) : (
            "Sign In"
          )}
        </button>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="px-4 bg-[#050505] text-zinc-500">
              Or continue with
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full py-3.5 px-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 text-sm group"
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
          <span className="text-zinc-300 group-hover:text-white transition-colors">
            Google
          </span>
        </button>

        <p className="text-center text-zinc-500 text-sm pt-4">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-blue-400 hover:text-blue-300 font-bold hover:underline transition-all"
          >
            Create account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
