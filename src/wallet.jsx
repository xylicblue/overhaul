// src/ConnectWalletButton.js
import React, { useState, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { supabase } from "./creatclient";
import { updateWallet, getWalletLinkNonce } from "./services/api";
import toast from "react-hot-toast";

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
      // Business rule: a wallet may only be linked to a KYC-verified profile.
      // Check server-side status before triggering the MetaMask popup so the
      // user is not asked to interact with their wallet only to be refused at
      // the signature or write step.
      if (session?.user?.id) {
        const { data: kycRow } = await supabase
          .from("profiles")
          .select("kyc_status")
          .eq("id", session.user.id)
          .maybeSingle();
        const kyc = kycRow?.kyc_status ?? "not_verified";
        if (kyc !== "verified" && kyc !== "completed") {
          toast.error(
            "Please complete identity verification (KYC) before connecting a wallet.",
            { id: "wallet-kyc-required" },
          );
          setIsLoading(false);
          return;
        }
      }

      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = signer.address;

      // F-11: prove control of `address` before linking. Ask the server for a
      // one-time challenge bound to (user, wallet, chain), sign it with the
      // wallet, then submit signature + address.
      const { message } = await getWalletLinkNonce(address, "ethereum");
      const signature = await signer.signMessage(message);
      await updateWallet(address, { signature, chain: "ethereum" });

      setWalletAddress(address);
      // 2. Add the success toast
      toast.success("Wallet connected successfully!");
    } catch (err) {
      console.error("Error connecting wallet:", err);
      // Suppress the "wallet already linked to another account" toast: it
      // fires legitimately when the same MetaMask account is used across
      // multiple Supabase logins and adds noise without changing what the
      // user can do about it.
      const msg = err?.message || "";
      if (!/already linked to another account/i.test(msg)) {
        toast.error(msg || "Failed to connect wallet.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    setIsLoading(true);
    try {
      await updateWallet(null);

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
