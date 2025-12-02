// Hooks for ClearingHouse contract interactions
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { parseUnits, formatUnits } from "ethers";
import {
  SEPOLIA_CONTRACTS,
  MARKET_IDS,
  COLLATERAL_TOKENS,
} from "../contracts/addresses";
import ClearingHouseABI from "../contracts/abis/ClearingHouse.json";
import CollateralVaultABI from "../contracts/abis/CollateralVault.json";

const SEPOLIA_CHAIN_ID = 11155111;
const MARKET_POSITION_CONFIG = [
  {
    key: "H100-PERP",
    marketId: MARKET_IDS["H100-PERP"],
    vammAddress: SEPOLIA_CONTRACTS.vammProxy, // ⭐ Active vAMM ($3.79/hour)
    displayName: "H100 GPU ($3.79/hr)",
    baseAssetSymbol: "GPU-HRS",
  },
  {
    key: "ETH-PERP",
    marketId: MARKET_IDS["ETH-PERP"],
    vammAddress: SEPOLIA_CONTRACTS.vammProxyOld, // Deprecated test market
    displayName: "Test Market (Deprecated)",
    baseAssetSymbol: "ETH",
  },
];

/**
 * Get user's position for a specific market
 * @param {string} marketId - Market ID (keccak256 of market name)
 * @param {string} userAddress - User's wallet address (optional, uses connected wallet)
 */
export function usePosition(marketId, userAddress = null) {
  const { address: connectedAddress } = useAccount();
  const addressToUse = userAddress || connectedAddress;

  const { data, isLoading, error, refetch } = useReadContract({
    address: SEPOLIA_CONTRACTS.clearingHouse,
    abi: ClearingHouseABI.abi,
    functionName: "getPosition",
    args: [addressToUse, marketId], // ABI signature: (address account, bytes32 marketId)
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: !!addressToUse && !!marketId,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  // Position struct: PositionView { size, margin, entryPriceX18, lastFundingIndex, realizedPnL }
  // size and lastFundingIndex are int256, others are uint256

  if (!data || !addressToUse) {
    return {
      position: null,
      isLoading,
      error,
      refetch,
    };
  }

  // Parse the position data from struct
  // Wagmi v2 returns struct as object with named properties, not array
  const size = data.size || 0n;
  const margin = data.margin || 0n;
  const entryPriceX18 = data.entryPriceX18 || 0n;
  const lastFundingIndex = data.lastFundingIndex || 0n;
  const realizedPnL = data.realizedPnL || 0n;

  const position = {
    size: size ? formatUnits(size, 18) : "0",
    sizeRaw: size,
    margin: margin ? formatUnits(margin, 18) : "0",
    marginRaw: margin,
    entryPriceX18: entryPriceX18 ? formatUnits(entryPriceX18, 18) : "0",
    lastFundingIndex: lastFundingIndex
      ? formatUnits(lastFundingIndex, 18)
      : "0",
    realizedPnL: realizedPnL ? formatUnits(realizedPnL, 18) : "0",
    // Helper flags
    hasPosition: size && size !== 0n,
    isLong: size && size > 0n,
    isShort: size && size < 0n,
  };

  return {
    position,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get all positions for the connected user across all markets
 */
export function useAllPositions() {
  const { address } = useAccount();

  const marketPositions = MARKET_POSITION_CONFIG.map((config) => ({
    config,
    ...usePosition(config.marketId, address),
  }));

  const positions = marketPositions
    .filter(({ position }) => position?.hasPosition)
    .map(({ config, position }) => ({
      marketKey: config.key,
      marketName: config.displayName,
      baseAssetSymbol: config.baseAssetSymbol,
      vammAddress: config.vammAddress,
      marketId: config.marketId,
      ...position,
    }));

  return {
    positions,
    isLoading: marketPositions.some(({ isLoading }) => isLoading),
    error: marketPositions.find(({ error }) => error)?.error || null,
  };
}

/**
 * Get user's account balance and margin info
 * @param {string} userAddress - User's wallet address
 */
export function useAccountValue(userAddress = null) {
  const { address: connectedAddress } = useAccount();
  const addressToUse = userAddress || connectedAddress;

  const { data, isLoading, refetch } = useReadContract({
    address: SEPOLIA_CONTRACTS.clearingHouse,
    abi: ClearingHouseABI.abi,
    functionName: "getAccountValue",
    args: [addressToUse],
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: !!addressToUse,
      refetchInterval: 5000,
    },
  });

  return {
    accountValue:
      data !== undefined && data !== null ? formatUnits(data, 18) : "0",
    accountValueRaw: data,
    isLoading,
    refetch,
  };
}

/**
 * Open a position (long or short)
 * @param {string} marketId - Market ID
 */
export function useOpenPosition(marketId) {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const openPosition = (isLong, size, priceLimit = 0) => {
    const sizeWei = parseUnits(size.toString(), 18);
    const priceLimitWei = parseUnits(priceLimit.toString(), 18);

    writeContract({
      address: SEPOLIA_CONTRACTS.clearingHouse,
      abi: ClearingHouseABI.abi,
      functionName: "openPosition",
      args: [marketId, isLong, sizeWei, priceLimitWei],
      chainId: SEPOLIA_CHAIN_ID,
      gas: 800000n, // Set reasonable gas limit for trading
    });
  };

  return {
    openPosition,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
    reset,
  };
}

/**
 * Close a position
 * @param {string} marketId - Market ID
 */
export function useClosePosition(marketId) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const closePosition = (size, priceLimit = 0) => {
    const sizeWei = parseUnits(size.toString(), 18);
    const priceLimitWei = parseUnits(priceLimit.toString(), 18);

    writeContract({
      address: SEPOLIA_CONTRACTS.clearingHouse,
      abi: ClearingHouseABI.abi,
      functionName: "closePosition",
      args: [marketId, sizeWei, priceLimitWei],
      chainId: SEPOLIA_CHAIN_ID,
      gas: 700000n, // Set reasonable gas limit for closing
    });
  };

  return {
    closePosition,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Deposit collateral
 * @param {string} tokenAddress - Collateral token address (e.g., USDC)
 */
export function useDeposit() {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isTxError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = (tokenAddress, amount) => {
    // Amount should be in token's decimals (6 for USDC, 18 for WETH)
    const decimals = tokenAddress === SEPOLIA_CONTRACTS.mockUSDC ? 6 : 18;
    const amountWei = parseUnits(amount.toString(), decimals);

    writeContract({
      address: SEPOLIA_CONTRACTS.clearingHouse,
      abi: ClearingHouseABI.abi,
      functionName: "deposit",
      args: [tokenAddress, amountWei],
      chainId: SEPOLIA_CHAIN_ID,
      gas: 500000n, // Set reasonable gas limit
    });
  };

  return {
    deposit,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    isTxError,
    hash,
    reset,
  };
}

/**
 * Withdraw collateral
 * @param {string} tokenAddress - Collateral token address
 */
export function useWithdraw() {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isTxError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const withdraw = (tokenAddress, amount) => {
    const decimals = tokenAddress === SEPOLIA_CONTRACTS.mockUSDC ? 6 : 18;
    const amountWei = parseUnits(amount.toString(), decimals);

    writeContract({
      address: SEPOLIA_CONTRACTS.clearingHouse,
      abi: ClearingHouseABI.abi,
      functionName: "withdraw",
      args: [tokenAddress, amountWei],
      chainId: SEPOLIA_CHAIN_ID,
      gas: 400000n, // Set reasonable gas limit
    });
  };

  return {
    withdraw,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    isTxError,
    hash,
    reset,
  };
}

/**
 * Get market risk parameters (IMR, MMR, liquidation penalty)
 * @param {string} marketId - Market ID (keccak256 of market name)
 */
export function useMarketRiskParams(marketId) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: SEPOLIA_CONTRACTS.clearingHouse,
    abi: ClearingHouseABI.abi,
    functionName: "marketRiskParams",
    args: [marketId],
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: !!marketId,
      refetchInterval: 30000, // Refetch every 30 seconds (risk params rarely change)
    },
  });

  // Debug logging
  console.log("useMarketRiskParams Debug:", {
    marketId,
    isLoading,
    error: error?.message,
    data,
    dataType: typeof data,
  });

  if (!data || !marketId) {
    return {
      riskParams: null,
      isLoading,
      error,
      refetch,
    };
  }

  // MarketRiskParams struct: { imrBps, mmrBps, liquidationPenaltyBps, penaltyCap }
  // Data might be returned as array [imrBps, mmrBps, liquidationPenaltyBps, penaltyCap]
  const imrBps = data[0] || data.imrBps || 0n;
  const mmrBps = data[1] || data.mmrBps || 0n;
  const liquidationPenaltyBps = data[2] || data.liquidationPenaltyBps || 0n;
  const penaltyCap = data[3] || data.penaltyCap || 0n;

  console.log("useMarketRiskParams Parsed:", {
    imrBps: String(imrBps),
    mmrBps: String(mmrBps),
    liquidationPenaltyBps: String(liquidationPenaltyBps),
    penaltyCap: String(penaltyCap),
  });

  const riskParams = {
    imrBps: Number(imrBps),
    mmrBps: Number(mmrBps),
    liquidationPenaltyBps: Number(liquidationPenaltyBps),
    penaltyCap: formatUnits(penaltyCap, 18), // Assuming quote token has 18 decimals
    // Human-readable percentages
    imrPercent: Number(imrBps) / 100, // bps to percent (e.g., 1000 bps = 10%)
    mmrPercent: Number(mmrBps) / 100,
    liquidationPenaltyPercent: Number(liquidationPenaltyBps) / 100,
  };

  console.log("useMarketRiskParams Final:", riskParams);

  return {
    riskParams,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get liquidation buffer + maintenance margin details for a market/account
 */
export function useLiquidationStatus(marketId, userAddress = null) {
  const { address: connectedAddress } = useAccount();
  const addressToUse = userAddress || connectedAddress;
  const enabled = !!addressToUse && !!marketId;

  const { data: liquidationData, isLoading: isChecking } = useReadContract({
    address: SEPOLIA_CONTRACTS.clearingHouse,
    abi: ClearingHouseABI.abi,
    functionName: "isLiquidatable",
    args: enabled ? [addressToUse, marketId] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled,
      refetchInterval: 5000,
    },
  });

  const { data: maintenanceData, isLoading: isFetchingMargin } =
    useReadContract({
      address: SEPOLIA_CONTRACTS.clearingHouse,
      abi: ClearingHouseABI.abi,
      functionName: "getMaintenanceMargin",
      args: enabled ? [addressToUse, marketId] : undefined,
      chainId: SEPOLIA_CHAIN_ID,
      query: {
        enabled,
        refetchInterval: 5000,
      },
    });

  return {
    isLiquidatable: Boolean(liquidationData),
    maintenanceMargin: maintenanceData ? formatUnits(maintenanceData, 18) : "0",
    maintenanceMarginRaw: maintenanceData,
    isLoading: isChecking || isFetchingMargin,
  };
}

/**
 * Get user's vault balance directly from CollateralVault
 * This is a fallback when getAccountValue fails
 * @param {string} userAddress - User's wallet address
 */
export function useVaultBalance(userAddress = null) {
  const { address: connectedAddress } = useAccount();
  const addressToUse = userAddress || connectedAddress;

  console.log("[useVaultBalance] Address:", addressToUse);
  console.log("[useVaultBalance] Vault:", SEPOLIA_CONTRACTS.collateralVault);
  console.log("[useVaultBalance] mUSDC:", SEPOLIA_CONTRACTS.mockUSDC);

  // Get mUSDC balance (6 decimals)
  const {
    data: usdcBalance,
    refetch: refetchUSDC,
    error: usdcError,
  } = useReadContract({
    address: SEPOLIA_CONTRACTS.collateralVault,
    abi: CollateralVaultABI.abi,
    functionName: "balanceOf",
    args: [addressToUse, SEPOLIA_CONTRACTS.mockUSDC],
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: !!addressToUse,
      refetchInterval: 5000,
    },
  });

  console.log("[useVaultBalance] mUSDC Balance Raw:", usdcBalance);
  console.log("[useVaultBalance] mUSDC Error:", usdcError);

  // Get mWETH balance (18 decimals)
  const { data: wethBalance, refetch: refetchWETH } = useReadContract({
    address: SEPOLIA_CONTRACTS.collateralVault,
    abi: CollateralVaultABI.abi,
    functionName: "balanceOf",
    args: [addressToUse, SEPOLIA_CONTRACTS.mockWETH],
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: !!addressToUse,
      refetchInterval: 5000,
    },
  });

  // Get total collateral value in USD (1e18)
  const {
    data: totalCollateralValue,
    refetch: refetchTotal,
    error: totalError,
  } = useReadContract({
    address: SEPOLIA_CONTRACTS.collateralVault,
    abi: CollateralVaultABI.abi,
    functionName: "getAccountCollateralValueX18",
    args: [addressToUse],
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: !!addressToUse,
      refetchInterval: 5000,
    },
  });

  console.log("[useVaultBalance] Total Collateral Raw:", totalCollateralValue);
  console.log("[useVaultBalance] Total Collateral Error:", totalError);

  const refetchAll = () => {
    refetchUSDC();
    refetchWETH();
    refetchTotal();
  };

  const formattedUSDC =
    usdcBalance !== undefined && usdcBalance !== null
      ? formatUnits(usdcBalance, 6)
      : "0";
  const formattedWETH =
    wethBalance !== undefined && wethBalance !== null
      ? formatUnits(wethBalance, 18)
      : "0";
  const formattedTotal =
    totalCollateralValue !== undefined && totalCollateralValue !== null
      ? formatUnits(totalCollateralValue, 18)
      : "0";

  console.log("[useVaultBalance] Formatted USDC:", formattedUSDC);
  console.log("[useVaultBalance] Formatted Total:", formattedTotal);

  return {
    usdcBalance: formattedUSDC,
    usdcBalanceRaw: usdcBalance,
    wethBalance: formattedWETH,
    wethBalanceRaw: wethBalance,
    totalCollateralValue: formattedTotal,
    totalCollateralValueRaw: totalCollateralValue,
    refetch: refetchAll,
  };
}
