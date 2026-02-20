// src/Web3AuthHandler.js
import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { supabase } from "./creatclient";
import { updateWallet } from "./services/api";
import toast from "react-hot-toast";

const Web3AuthHandler = () => {
  const { address, isConnected, isDisconnected } = useAccount();
  const userIdRef = useRef(null);

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

      if (isConnected && address) {
        toast.success("Wallet connected!");
        console.log(`Wallet connected: ${address}. Updating profile...`);
        try {
          await updateWallet(address);
        } catch (e) { console.warn("Failed to update wallet:", e); }
      }

      if (isDisconnected) {
        toast.success("Wallet disconnected.");
        console.log("Wallet disconnected. Removing address from profile...");
        try {
          await updateWallet(null);
        } catch (e) { console.warn("Failed to clear wallet:", e); }
      }
    };

    updateUserProfile();
  }, [address, isConnected, isDisconnected]);

  // This component renders nothing. It just handles logic in the background.
  return null;
};

export default Web3AuthHandler;
