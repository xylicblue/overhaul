import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "./creatclient";
import AuthLayout from "./authlayout";
import toast from "react-hot-toast";
import "./auth.css";
import LoadingSpinner from "./spinner";

const CreateUsernamePage = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // This effect runs on page load to check if the user needs to create a profile
  useEffect(() => {
    const checkProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login"); // If no user is logged in, send them to login
        return;
      }

      // Check if they already have a username
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // Ignore 'not found' error
        setError(error.message);
      } else if (profile && profile.username) {
        navigate("/"); // User already has a username, send them home
      } else {
        setLoading(false); // New user! Show the form.
      }
    };
    checkProfile();
  }, [navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Update the username in the profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Profile completed successfully!");
      navigate("/"); // All done, send them home!
    } catch (error) {
      if (
        error.message.includes("duplicate key value violates unique constraint")
      ) {
        setError("This username is already taken. Please choose another.");
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-form-container">
        <div className="form-header">
          <h3>Complete Your Profile</h3>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              marginTop: "0.5rem",
            }}
          >
            Welcome! Please choose a unique username to continue.
          </p>
        </div>
        <form onSubmit={handleUpdateProfile} className="auth-form">
          <div className="input-wrapper">
            <label htmlFor="username">Username</label>
            <div className="input-field">
              <svg className="input-icon" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <input
                type="text"
                id="username"
                placeholder="Choose a unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength="3"
                required
              />
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="auth-button"
            disabled={loading || username.length < 3}
          >
            {loading ? "Saving..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default CreateUsernamePage;
