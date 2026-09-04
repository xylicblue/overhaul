// src/Web3AuthHandler.js
import { useEffect, useRef } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { supabase } from "./creatclient";
import { updateWallet, getWalletLinkNonce } from "./services/api";
import toast from "react-hot-toast";

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
  const userIdRef = useRef(null);
  // F-11: avoid re-prompting the user for a signature every render cycle.
  // Once we successfully linked `address`, remember it so a re-mount of this
  // handler with the same wagmi state doesn't fire another wallet-sign popup.
  const linkedAddressRef = useRef(null);
  // KYC guard: remember the last address we refused so we don't repeatedly
  // toast the same error while wagmi keeps re-firing the connect event.
  const kycBlockedAddressRef = useRef(null);

  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        userIdRef.current = user.id;
      }
    };
    getUserId();
  }, []);

  useEffect(() => {
    const updateUserProfile = async () => {
      if (!userIdRef.current) return;

      if (isConnected && address && linkedAddressRef.current !== address) {
        // Refuse the link before prompting for a signature the server will
        // reject anyway. Also tear down the wagmi connection so the browser
        // does not report a "connected" wallet that the profile does not
        // acknowledge.
        const kyc = await fetchKycStatus(userIdRef.current);
        if (!isKycVerified(kyc)) {
          if (kycBlockedAddressRef.current !== address) {
            kycBlockedAddressRef.current = address;
            toast.error(
              "Please complete identity verification (KYC) before connecting a wallet.",
              { id: "wallet-kyc-required" },
            );
          }
          try { disconnect(); } catch { /* ignore */ }
          return;
        }
        kycBlockedAddressRef.current = null;

        console.log(`Wallet connected: ${address}. Requesting link challenge…`);
        try {
          // F-11: prove control of `address` before writing it to the profile.
          const { message } = await getWalletLinkNonce(address, "ethereum");
          const signature = await signMessageAsync({ message });
          await updateWallet(address, { signature, chain: "ethereum" });
          linkedAddressRef.current = address;
          toast.success("Wallet connected!");
        } catch (e) {
          console.warn("Failed to link wallet:", e);
          // Suppress the "wallet already linked to another account" toast:
          // this fires legitimately whenever the same MetaMask account is
          // used across multiple Supabase logins, and the message is more
          // alarming than helpful. Still logged to the console for debugging.
          const msg = e?.message || "";
          if (!/already linked to another account/i.test(msg)) {
            toast.error(msg || "Failed to link wallet.");
          }
        }
      }

      if (isDisconnected) {
        toast.success("Wallet disconnected.");
        console.log("Wallet disconnected. Removing address from profile...");
        try {
          await updateWallet(null);
          linkedAddressRef.current = null;
          kycBlockedAddressRef.current = null;
        } catch (e) { console.warn("Failed to clear wallet:", e); }
      }
    };

    updateUserProfile();
  }, [address, isConnected, isDisconnected, signMessageAsync, disconnect]);

  // This component renders nothing. It just handles logic in the background.
  return null;
};

export default Web3AuthHandler;
