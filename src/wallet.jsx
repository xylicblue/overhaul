// src/ConnectWalletButton.js
import React, { useState, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { supabase } from "./creatclient";
import toast from "react-hot-toast"; // 1. Make sure toast is imported

const ConnectWalletButton = ({ session, initialAddress }) => {
  const [walletAddress, setWalletAddress] = useState(initialAddress || null);
  const [isLoading, setIsLoading] = useState(false);
  // We no longer need the errorMessage state
  // const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setWalletAddress(initialAddress);
  }, [initialAddress]);

  const connectWallet = async () => {
    setIsLoading(true);
    // Remove the old error message reset
    // setErrorMessage('');

    if (typeof window.ethereum === "undefined") {
      toast.error("MetaMask is not installed. Please install it to continue.");
      setIsLoading(false);
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = signer.address;

      const { error } = await supabase
        .from("profiles")
        .update({ wallet_address: address })
        .eq("id", session.user.id);

      if (error) throw error;

      setWalletAddress(address);
      // 2. Add the success toast
      toast.success("Wallet connected successfully!");
    } catch (err) {
      console.error("Error connecting wallet:", err);
      // 3. Add the error toast
      toast.error(err.message || "Failed to connect wallet.");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ wallet_address: null })
        .eq("id", session.user.id);

      if (error) throw error;

      setWalletAddress(null);
      // 4. Add the disconnect success toast
      toast.success("Wallet disconnected.");
    } catch (err) {
      console.error("Error disconnecting wallet:", err);
      toast.error("Failed to disconnect wallet.");
    } finally {
      setIsLoading(false);
    }
  };

  const shortAddress = (addr) =>
    `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  return (
    <div className="wallet-section">
      {walletAddress ? (
        <div className="wallet-connected">
          <div className="wallet-info">
            <span className="status-indicator"></span>
            <span className="wallet-address">
              {shortAddress(walletAddress)}
            </span>
          </div>
          <button
            onClick={disconnectWallet}
            disabled={isLoading}
            className="disconnect-button"
          >
            {isLoading ? "..." : "Disconnect"}
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isLoading}
          className="connect-button"
        >
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
      {/* 5. We can now remove the old error message paragraph */}
      {/* {errorMessage && <p className="wallet-error">{errorMessage}</p>} */}
    </div>
  );
};

export default ConnectWalletButton;
