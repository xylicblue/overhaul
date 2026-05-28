import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./creatclient";
import { checkUsername } from "./services/api";
import toast from "react-hot-toast";
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineUser, HiOutlineEye, HiOutlineEyeSlash, HiCheck } from "react-icons/hi2";
import AuthLayout from "./components/AuthLayout";
import WalletAuthButtons from "./components/WalletAuthButtons";

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const [validation, setValidation] = useState({
    length: false,
    number: false,
    specialChar: false,
    match: false,
  });

  const navigate = useNavigate();

  // Real-time password validation
  useEffect(() => {
    setValidation({
      length: password.length >= 8,
      number: /\d/.test(password),
      specialChar: /[^A-Za-z0-9]/.test(password),
      match: password && password === confirmPassword,
    });
  }, [password, confirmPassword]);

  const isFormValid =
    email &&
    username &&
    validation.length &&
    validation.number &&
    validation.specialChar &&
    validation.match;

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    setError("");
    setUsernameError("");

    try {
      // Check if username is unique via API
      const { available } = await checkUsername(username);

      if (!available) {
        setUsernameError("Username is already taken.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) throw error;

      toast.success(
        "Signup successful! Please check your email to confirm your account."
      );
      navigate("/login");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const requirementItem = (isValid, text) => (
    <motion.li
      className={`flex items-center gap-2 text-xs font-medium ${isValid ? "text-green-400" : "text-zinc-500"}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {isValid ? <HiCheck className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-600" />}
      {text}
    </motion.li>
  );

  return (
    <AuthLayout 
      title="Create Account" 
      subtitle="Join the future of decentralized trading."
    >
      <form onSubmit={handleSignup} className="space-y-5">
        
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
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
          <label htmlFor="username" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Username</label>
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
              required
              className={`block w-full pl-11 pr-4 py-3.5 bg-zinc-900/50 border ${usernameError ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50" : "border-zinc-800 focus:border-blue-500 focus:ring-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)]"} rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all duration-300 text-sm`}
            />
          </div>
          <AnimatePresence>
            {usernameError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-400 text-xs ml-1 font-medium"
              >
                {usernameError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <HiOutlineLockClosed className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Create a strong password"
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
              {showPassword ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Confirm Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <HiOutlineLockClosed className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="block w-full pl-11 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 text-sm"
            />
          </div>
        </div>

        <AnimatePresence>
          {(password || confirmPassword) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/50"
            >
              <ul className="grid grid-cols-2 gap-3">
                {requirementItem(validation.length, "8+ chars")}
                {requirementItem(validation.number, "Number")}
                {requirementItem(validation.specialChar, "Special char")}
                {requirementItem(validation.match, "Match")}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-start gap-3">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!isFormValid || loading}
          className="w-full py-4 px-6 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm mt-4"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Account...
            </span>
          ) : (
            "Create Account"
          )}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="px-4 bg-[#050505] text-zinc-500">Or sign up with wallet</span>
          </div>
        </div>

        <WalletAuthButtons onSuccess={() => navigate("/")} onNewUser={() => navigate("/welcome")} />

        <p className="text-center text-zinc-500 text-sm pt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold hover:underline transition-all">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default SignupPage;
