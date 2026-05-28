// src/Web3AuthHandler.js
import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { supabase } from "./creatclient"; // Adjust path if needed
import toast from "react-hot-toast";

const Web3AuthHandler = () => {
  const { address, isConnected, isDisconnected } = useAccount();
  const userIdRef = useRef(null); // Use a ref to store the user ID

  // Get the Supabase user ID once
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

  // This effect runs whenever the wallet's connection status or address changes
  useEffect(() => {
    const updateUserProfile = async () => {
      if (!userIdRef.current) return; // Don't run if we don't know the user

      // When a wallet connects, save the address
      if (isConnected && address) {
        toast.success("Wallet connected!");
        console.log(`Wallet connected: ${address}. Updating profile...`);
        await supabase
          .from("profiles")
          .update({ wallet_address: address })
          .eq("id", userIdRef.current);
      }

      // When a wallet disconnects, remove the address
      if (isDisconnected) {
        toast.success("Wallet disconnected.");
        console.log("Wallet disconnected. Removing address from profile...");
        await supabase
          .from("profiles")
          .update({ wallet_address: null })
          .eq("id", userIdRef.current);
      }
    };

    updateUserProfile();
  }, [address, isConnected, isDisconnected]);

  // This component renders nothing. It just handles logic in the background.
  return null;
};

export default Web3AuthHandler;
