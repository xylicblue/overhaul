import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ClipboardCheck, Lock } from "lucide-react";
import { supabase } from "./creatclient";
import EntityRiskReview from "./components/EntityRiskReview";

function PortalFrame({ children }) {
  return (
    <main className="min-h-screen bg-surface-0 px-4 pb-16 pt-10 md:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-[1500px]">{children}</div>
    </main>
  );
}

export default function CompliancePortal() {
  const [access, setAccess] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (active) setAccess("unauthenticated");
          return;
        }
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();
        if (profileError) throw profileError;
        if (active) setAccess(data?.is_admin ? "ready" : "forbidden");
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.message || "Could not verify Compliance access.");
        setAccess("error");
      }
    })();
    return () => { active = false; };
  }, []);

  if (access !== "ready") {
    const copy = {
      loading: ["Opening Compliance portal", "Verifying your secure admin session."],
      unauthenticated: ["Sign in required", "Sign in with an admin account to open the Compliance portal."],
      forbidden: ["Access restricted", "This portal is available only to authorised Compliance administrators."],
      error: ["Could not open the portal", error],
    }[access];
    return (
      <PortalFrame>
        <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface-1">
            {access === "loading"
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-blue-400" />
              : <Lock size={17} className="text-ink-faint" />}
          </div>
          <h1 className="text-[15px] font-semibold text-ink">{copy[0]}</h1>
          <p className="max-w-sm text-[12px] leading-5 text-ink-ghost">{copy[1]}</p>
        </div>
      </PortalFrame>
    );
  }

  return (
    <PortalFrame>
      <header className="mb-7 flex flex-col gap-5 border-b border-line-subtle pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">
            <ClipboardCheck size={13} /> Compliance
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-ink md:text-[28px]">Entity applications</h1>
          <p className="mt-2 max-w-2xl text-[12px] leading-5 text-ink-ghost">
            Review identity status, application evidence and server-calculated risk in one controlled workspace.
          </p>
        </div>
        <Link
          to="/admin"
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-line bg-surface-1 px-3 py-2 text-[11px] font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          Platform dashboard <ArrowUpRight size={13} />
        </Link>
      </header>

      <EntityRiskReview standalone />
    </PortalFrame>
  );
}
