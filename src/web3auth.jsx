// src/Web3AuthHandler.js
import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { supabase } from "./creatclient";
import { updateWallet, getWalletLinkNonce } from "./services/api";
import toast from "react-hot-toast";
import { getEntityAccessState } from "./services/entityOnboarding";

// Business rule: a wallet may only be linked to a profile whose Sumsub KYC
// has been approved. Enforced server-side by api-profile (kyc_required
// response). This helper is the browser-side counterpart used to avoid
// prompting the user for a wallet signature we already know the server will
// refuse, and to actively disconnect a wallet that gets connected by any
// path (a saved MetaMask "connected sites" entry, a deep link, a browser
// extension reconnect) before we would otherwise write it to the profile.
async function fetchKycStatus(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("kyc_status")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data?.kyc_status ?? "not_verified";
}
function isKycVerified(status) {
  return status === "verified" || status === "completed";
}

const Web3AuthHandler = () => {
  const { address, isConnected, isDisconnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [userId, setUserId] = useState(null);
  // F-11: avoid re-prompting the user for a signature every render cycle.
  // Once we successfully linked `address`, remember it so a re-mount of this
  // handler with the same wagmi state doesn't fire another wallet-sign popup.
  const linkedAddressRef = useRef(null);
  const linkingAddressRef = useRef(null);
  const onboardingBlockedAddressRef = useRef(null);
  // KYC guard: remember the last address we refused so we don't repeatedly
  // toast the same error while wagmi keeps re-firing the connect event.
  const kycBlockedAddressRef = useRef(null);
  // A wallet provider reports "connected" before ByteStrike has accepted the
  // wallet for this profile. Rejected provisional connections must be torn
  // down without also clearing a previously approved profile wallet.
  const suppressNextProfileUnlinkRef = useRef(false);
  const wasConnectedRef = useRef(isConnected);

  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const rejectProvisionalConnection = () => {
      linkedAddressRef.current = null;
      linkingAddressRef.current = null;
      suppressNextProfileUnlinkRef.current = true;
      try { disconnect(); } catch { /* ignore */ }
    };

    const updateUserProfile = async () => {
      // getUser() is asynchronous. Keeping the ID in React state ensures this
      // effect runs again if the wallet connected before authentication had
      // finished resolving (the first-login race that previously left a
      // rejected wallet visibly connected).
      if (!userId) return;

      if (isConnected && address) {
        wasConnectedRef.current = true;
        const normalizedAddress = address.toLowerCase();
        if (
          linkedAddressRef.current === normalizedAddress ||
          linkingAddressRef.current === normalizedAddress
        ) return;
        linkingAddressRef.current = normalizedAddress;

        // Entity collection precedes KYC and wallet linking. Check it even for
        // provider-restored sessions, not only explicit Connect button clicks.
        try {
          const access = await getEntityAccessState(userId);
          if (!access.isAdmin && !access.onboardingComplete) {
            if (onboardingBlockedAddressRef.current !== address) {
              onboardingBlockedAddressRef.current = address;
              toast.error(
                "Complete entity onboarding before connecting a wallet.",
                { id: "wallet-onboarding-required" },
              );
            }
            rejectProvisionalConnection();
            return;
          }
          onboardingBlockedAddressRef.current = null;
        } catch (error) {
          console.warn("Could not verify entity onboarding before wallet link:", error);
          rejectProvisionalConnection();
          return;
        }

        // Refuse the link before prompting for a signature the server will
        // reject anyway. Also tear down the wagmi connection so the browser
        // does not report a "connected" wallet that the profile does not
        // acknowledge.
        const kyc = await fetchKycStatus(userId);
        if (!isKycVerified(kyc)) {
          if (kycBlockedAddressRef.current !== address) {
            kycBlockedAddressRef.current = address;
            toast.error(
              "Please complete identity verification (KYC) before connecting a wallet.",
              { id: "wallet-kyc-required" },
            );
          }
          rejectProvisionalConnection();
          return;
        }
        kycBlockedAddressRef.current = null;

        console.log(`Wallet connected: ${address}. Requesting link challenge…`);
        try {
          // F-11: prove control of `address` before writing it to the profile.
          const { message } = await getWalletLinkNonce(address, "ethereum");
          const signature = await signMessageAsync({ message });
          await updateWallet(address, { signature, chain: "ethereum" });
          if (!cancelled) {
            linkedAddressRef.current = normalizedAddress;
            toast.success("Wallet connected!");
          }
        } catch (e) {
          console.warn("Failed to link wallet:", e);
          // Suppress the "wallet already linked to another account" toast:
          // this fires legitimately whenever the same MetaMask account is
          // used across multiple Supabase logins, and the message is more
          // alarming than helpful. Still logged to the console for debugging.
          const msg = e?.message || "";
          // Any failed challenge/signature/profile write means ByteStrike did
          // not accept this connection. Tear down the provisional wagmi state
          // immediately; this is especially important for an entity wallet
          // rejected by the declared-and-screened-address control.
          rejectProvisionalConnection();
          if (!/already linked to another account/i.test(msg)) {
            toast.error(msg || "Failed to link wallet.");
          }
        } finally {
          linkingAddressRef.current = null;
        }
      }

      if (isDisconnected) {
        // Ignore the initial disconnected render and the disconnect generated
        // by a rejected provisional link. Neither represents a user asking to
        // unlink an accepted wallet from their ByteStrike profile.
        if (!wasConnectedRef.current) return;
        wasConnectedRef.current = false;
        if (suppressNextProfileUnlinkRef.current) {
          suppressNextProfileUnlinkRef.current = false;
          linkedAddressRef.current = null;
          linkingAddressRef.current = null;
          return;
        }

        toast.success("Wallet disconnected.");
        console.log("Wallet disconnected. Removing address from profile...");
        try {
          await updateWallet(null);
          linkedAddressRef.current = null;
          onboardingBlockedAddressRef.current = null;
          kycBlockedAddressRef.current = null;
        } catch (e) { console.warn("Failed to clear wallet:", e); }
      }
    };

    updateUserProfile();
    return () => { cancelled = true; };
  }, [address, isConnected, isDisconnected, signMessageAsync, disconnect, userId]);

  // This component renders nothing. It just handles logic in the background.
  return null;
};

export default Web3AuthHandler;
