// src/Web3AuthHandler.js
import { useEffect, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { supabase } from "./creatclient";
import { updateWallet, getWalletLinkNonce } from "./services/api";
import toast from "react-hot-toast";

const Web3AuthHandler = () => {
  const { address, isConnected, isDisconnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const userIdRef = useRef(null);
  // F-11: avoid re-prompting the user for a signature every render cycle.
  // Once we successfully linked `address`, remember it so a re-mount of this
  // handler with the same wagmi state doesn't fire another wallet-sign popup.
  const linkedAddressRef = useRef(null);

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
          toast.error(e?.message || "Failed to link wallet.");
        }
      }

      if (isDisconnected) {
        toast.success("Wallet disconnected.");
        console.log("Wallet disconnected. Removing address from profile...");
        try {
          await updateWallet(null);
          linkedAddressRef.current = null;
        } catch (e) { console.warn("Failed to clear wallet:", e); }
      }
    };

    updateUserProfile();
  }, [address, isConnected, isDisconnected, signMessageAsync]);

  // This component renders nothing. It just handles logic in the background.
  return null;
};

export default Web3AuthHandler;
