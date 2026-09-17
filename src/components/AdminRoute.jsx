import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../creatclient";

/**
 * Fail-closed route guard for every administrative surface.
 *
 * Page-level checks still protect their own data loading, while this guard
 * owns navigation: guests, non-admin users, expired sessions, sign-outs, and
 * live admin-role revocations are all returned to the public home page.
 */
export default function AdminRoute({ children }) {
  const [access, setAccess] = useState("checking");
  const verificationId = useRef(0);

  useEffect(() => {
    let mounted = true;
    let profileChannel = null;

    const removeProfileChannel = () => {
      if (!profileChannel) return;
      supabase.removeChannel(profileChannel);
      profileChannel = null;
    };

    const deny = () => {
      verificationId.current += 1;
      removeProfileChannel();
      if (mounted) setAccess("denied");
    };

    const watchAdminRole = (userId) => {
      removeProfileChannel();
      profileChannel = supabase
        .channel(`admin-route-profile-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            if (payload.new?.is_admin !== true) deny();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${userId}`,
          },
          deny
        )
        .subscribe();
    };

    const verify = async (session) => {
      const requestId = ++verificationId.current;
      const userId = session?.user?.id;
      if (!userId) {
        deny();
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (!mounted || requestId !== verificationId.current) return;
      if (error || data?.is_admin !== true) {
        deny();
        return;
      }

      setAccess("allowed");
      watchAdminRole(userId);
    };

    supabase.auth.getSession().then(({ data: { session } }) => verify(session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        deny();
        return;
      }

      if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        verify(session);
      }
    });

    return () => {
      mounted = false;
      verificationId.current += 1;
      subscription.unsubscribe();
      removeProfileChannel();
    };
  }, []);

  if (access === "denied") return <Navigate to="/" replace />;

  if (access === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="h-5 w-5 animate-spin rounded-full border border-white/[0.08] border-t-white/[0.35]" />
      </div>
    );
  }

  return children;
}
