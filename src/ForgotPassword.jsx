import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./creatclient";
import toast from "react-hot-toast";
import {
  HiOutlineEnvelope,
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
} from "react-icons/hi2";
import AuthLayout from "./components/AuthLayout";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success("Password reset email sent!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <AuthLayout
        title="Check Your Email"
        subtitle="We've sent you a password reset link."
      >
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
            <HiOutlineCheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-green-400 font-medium mb-2">
              Email Sent Successfully!
            </p>
            <p className="text-zinc-400 text-sm">
              We've sent a password reset link to{" "}
              <span className="text-white font-medium">{email}</span>. Please
              check your inbox and click the link to reset your password.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400">
            <p className="font-medium text-zinc-300 mb-2">
              Didn't receive the email?
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>

          <button
            onClick={() => setEmailSent(false)}
            className="w-full py-3.5 px-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            Try a different email
          </button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
          >
            <HiOutlineArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot Password?"
      subtitle="No worries, we'll send you reset instructions."
    >
      <form onSubmit={handleResetPassword} className="space-y-6">
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
          <p className="text-xs text-zinc-500 mt-2">
            Enter the email address associated with your account and we'll send
            you a link to reset your password.
          </p>
        </div>

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
              Sending...
            </span>
          ) : (
            "Send Reset Link"
          )}
        </button>

        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors pt-2"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
