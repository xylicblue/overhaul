import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import sumsubWebSdk from "@sumsub/websdk";
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { openConnectedPersonKycInvite } from "./services/api";
import logo from "./assets/ByteStrikeLogoFinal.png";
import "./connected-person-verification.css";

export default function ConnectedPersonVerificationPage() {
  const location = useLocation();
  const invite = useMemo(() => new URLSearchParams(location.search).get("invite") || "", [location.search]);
  const [phase, setPhase] = useState("intro");
  const [context, setContext] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Secure identity verification | ByteStrike";
    let robots = document.querySelector('meta[name="robots"]');
    const created = !robots;
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    const previousRobots = robots.getAttribute("content");
    robots.setAttribute("content", "noindex, nofollow, noarchive");
    if (invite) window.history.replaceState({}, "", "/verify-connected-person");
    return () => {
      document.title = previousTitle;
      if (created) robots.remove();
      else if (previousRobots) robots.setAttribute("content", previousRobots);
    };
  }, [invite]);

  const begin = async () => {
    if (!invite) {
      setMessage("The private invitation token is missing. Ask the entity's primary contact to send a new invitation.");
      setPhase("error");
      return;
    }
    setPhase("loading");
    try {
      const getToken = async () => {
        const response = await openConnectedPersonKycInvite(invite);
        setContext(response);
        return response.token;
      };
      const token = await getToken();
      setPhase("sdk");
      window.requestAnimationFrame(() => {
        sumsubWebSdk
          .init(token, getToken)
          .withConf({ lang: "en" })
          .on("idCheck.onDone", () => setPhase("submitted"))
          .on("idCheck.applicantStatusUpdated", (payload) => {
            if (["pending", "completed"].includes(payload?.reviewStatus)) setPhase("submitted");
          })
          .build()
          .launch("#connected-person-sumsub");
      });
    } catch (error) {
      setMessage(error.message || "Verification could not be opened. Ask the entity's primary contact for a new invitation.");
      setPhase("error");
    }
  };

  return (
    <main className="person-verification-page">
      <header className="person-verification-topbar">
        <Link to="/" aria-label="Return to ByteStrike home"><img src={logo} alt="ByteStrike" /></Link>
        <span><LockKeyhole size={14} /> Secure verification</span>
      </header>

      <section className={`person-verification-panel ${phase === "sdk" ? "is-sdk" : ""}`}>
        {phase === "intro" && (
          <div className="person-verification-intro">
            <div className="person-verification-icon"><ShieldCheck size={24} /></div>
            <p>Connected person verification</p>
            <h1>Confirm your identity securely.</h1>
            <span>
              You have been identified as a connected person in an entity application to ByteStrike. Verification is
              completed by Sumsub and normally takes only a few minutes.
            </span>
            <div className="person-verification-points">
              <div><strong>Private access</strong><span>This link opens only your identity check.</span></div>
              <div><strong>No platform account</strong><span>You will not receive access to the entity profile or trading.</span></div>
              <div><strong>Regulatory review</strong><span>Your result is shared with ByteStrike Compliance.</span></div>
            </div>
            <button type="button" onClick={begin}>Begin verification <ArrowRight size={16} /></button>
            <small>By continuing, you will be transferred to Sumsub's secure verification interface.</small>
          </div>
        )}

        {phase === "loading" && (
          <div className="person-verification-state"><Loader2 size={23} className="spin" /><h1>Opening secure verification</h1><span>Please keep this page open.</span></div>
        )}

        {phase === "sdk" && (
          <div className="person-verification-sdk-wrap">
            <div className="person-verification-sdk-heading">
              <div><p>Identity verification</p><h1>{context?.entity?.name || "Entity application"}</h1></div>
              <span>Powered by Sumsub</span>
            </div>
            <div id="connected-person-sumsub" className="person-verification-sdk" />
          </div>
        )}

        {phase === "submitted" && (
          <div className="person-verification-state is-complete">
            <div className="person-verification-icon"><CheckCircle2 size={25} /></div>
            <p>Verification submitted</p>
            <h1>Thank you. Your information is under review.</h1>
            <span>The entity's primary contact will see when the verification result is available. You may close this page.</span>
          </div>
        )}

        {phase === "error" && (
          <div className="person-verification-state is-error">
            <div className="person-verification-icon"><LockKeyhole size={23} /></div>
            <p>Invitation unavailable</p>
            <h1>We could not open this verification.</h1>
            <span>{message}</span>
          </div>
        )}
      </section>

      <footer className="person-verification-footer">Need help? Contact <a href="mailto:support@byte-strike.com">support@byte-strike.com</a>.</footer>
    </main>
  );
}
