// Hooks for ClearingHouse contract interactions
import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  usePublicClient,
} from "wagmi";
import { parseUnits, formatUnits } from "ethers";
import {
  SEPOLIA_CONTRACTS,
  getActiveMarkets,
} from "../contracts/addresses";
import ClearingHouseABI from "../contracts/abis/ClearingHouse.json";
import CollateralVaultABI from "../contracts/abis/CollateralVault.json";
import MarketRegistryABI from "../contracts/abis/MarketRegistry.json";

const SEPOLIA_CHAIN_ID = 11155111;
const WAD = 10n ** 18n;
const BPS_DENOMINATOR = 10000n;
const UINT256_MAX = (1n << 256n) - 1n;
const ORACLE_PRICE_ABI = [
  {
    inputs: [],
    name: "getPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];
const MARKET_POSITION_CONFIG = getActiveMarkets().map((market) => ({
  key: market.name,
  marketId: market.id,
  vammAddress: market.vamm,
  displayName: market.displayName,
  baseAssetSymbol: "GPU-HRS",
}));

const formatX18 = (value) =>
  value !== undefined && value !== null ? formatUnits(value, 18) : "0";

const numberOrZero = (value) => {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const absBigInt = (value) => {
  const bigint = BigInt(value ?? 0n);
  return bigint < 0n ? -bigint : bigint;
};

const mulDivRoundUp = (a, b, denominator) => {
  if (a === 0n || b === 0n) return 0n;
  return (a * b + denominator - 1n) / denominator;
};

export function calculatePendingFunding(position, fundingRate) {
  if (!position) return 0;

  const isLong = Boolean(position.isLong);
  const currentPay = numberOrZero(isLong ? fundingRate?.longPay : fundingRate?.shortPay);
  const currentReceive = numberOrZero(isLong ? fundingRate?.longReceive : fundingRate?.shortReceive);
  const lastPay = numberOrZero(position.lastFundingPayIndex);
  const lastReceive = numberOrZero(position.lastFundingReceiveIndex);
  const absSize = Math.abs(numberOrZero(position.size));

  return ((currentReceive - lastReceive) - (currentPay - lastPay)) * absSize;
}

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

  // Position struct: PositionView {
  //   size, margin, entryPriceX18, lastFundingPayIndex,
  //   lastFundingReceiveIndex, realizedPnL
  // }

  if (!data || !addressToUse) {
    return {
      position: null,
      isLoading,
      error,
      refetch,
    };
  }

  // Parse the position data from struct. Wagmi v2 returns named properties,
  // but keep tuple indexes as a fallback for ABI/client variance.
  const size = data.size ?? data[0] ?? 0n;
  const margin = data.margin ?? data[1] ?? 0n;
  const entryPriceX18 = data.entryPriceX18 ?? data[2] ?? 0n;
  const lastFundingPayIndex = data.lastFundingPayIndex ?? data.lastFundingIndex ?? data[3] ?? 0n;
  const hasReceiveIndex =
    data.lastFundingReceiveIndex !== undefined ||
    (Array.isArray(data) && data.length >= 6);
  const lastFundingReceiveIndex = hasReceiveIndex
    ? data.lastFundingReceiveIndex ?? data[4] ?? 0n
    : 0n;
  const realizedPnL = data.realizedPnL ?? data[hasReceiveIndex ? 5 : 4] ?? 0n;

  const position = {
    size: formatX18(size),
    sizeRaw: size,
    margin: formatX18(margin),
    marginRaw: margin,
    entryPriceX18: formatX18(entryPriceX18),
    lastFundingPayIndex: formatX18(lastFundingPayIndex),
    lastFundingPayIndexRaw: lastFundingPayIndex,
    lastFundingReceiveIndex: formatX18(lastFundingReceiveIndex),
    lastFundingReceiveIndexRaw: lastFundingReceiveIndex,
    realizedPnL: formatX18(realizedPnL),
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
    refetch: () => Promise.allSettled(marketPositions.map(({ refetch }) => refetch?.())),
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
  const { address }    = useAccount();
  const publicClient   = usePublicClient({ chainId: SEPOLIA_CHAIN_ID });

  const {
    writeContract,
    writeContractAsync,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  const openPosition = async (isLong, size, amountLimit = 0) => {
    const sizeWei        = parseUnits(size.toString(), 18);
    const amountLimitWei = typeof amountLimit === "bigint" ? amountLimit : parseUnits(amountLimit.toString(), 18);

    const request = {
      address: SEPOLIA_CONTRACTS.clearingHouse,
      abi: ClearingHouseABI.abi,
      functionName: "openPosition",
      args: [marketId, isLong, sizeWei, amountLimitWei],
      chainId: SEPOLIA_CHAIN_ID,
    };

    if (writeContractAsync) {
      return writeContractAsync(request);
    }

    return writeContract(request);
  };

  // Dry-run via eth_call before sending to wallet. Throws if the contract
  // would revert, letting the caller decode the error without a real tx.
  const simulateOpenPosition = async (isLong, size, amountLimit = 0n) => {
    if (!address)      throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("RPC client unavailable");
    const sizeWei        = parseUnits(size.toString(), 18);
    const amountLimitWei = typeof amountLimit === "bigint" ? amountLimit : BigInt(0);
    return publicClient.simulateContract({
      address: SEPOLIA_CONTRACTS.clearingHouse,
      abi:     ClearingHouseABI.abi,
      functionName: "openPosition",
      args:    [marketId, isLong, sizeWei, amountLimitWei],
      account: address,
    });
  };

  return {
    openPosition,
    simulateOpenPosition,
    isPending: isPending || isConfirming,
    isWalletPending: isPending,
    isConfirming,
    isSuccess,
    isReceiptError,
    error,
    receiptError,
    hash,
    reset,
  };
}

/**
 * Close a position
 * @param {string} marketId - Market ID
 */
export function useClosePosition(marketId) {
  const { writeContract, writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isReceiptFetched,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const closePositionRaw = async (sizeWei, priceLimitWei = 0n) => {
    const rawSize = BigInt(sizeWei);
    const rawPriceLimit = BigInt(priceLimitWei);

    const request = {
      address: SEPOLIA_CONTRACTS.clearingHouse,
      abi: ClearingHouseABI.abi,
      functionName: "closePosition",
      args: [marketId, rawSize, rawPriceLimit],
      chainId: SEPOLIA_CHAIN_ID,
    };

    if (writeContractAsync) {
      return writeContractAsync(request);
    }

    return writeContract(request);
  };

  const closePosition = async (size, priceLimit = 0) => closePositionRaw(
    parseUnits(size.toString(), 18),
    parseUnits(priceLimit.toString(), 18)
  );

  return {
    closePosition,
    closePositionRaw,
    isPending: isPending || isConfirming,
    isWalletPending: isPending,
    isConfirming,
    isReceiptFetched,
    isSuccess: receipt?.status === "success",
    isReverted: receipt?.status === "reverted",
    isReceiptError,
    error,
    receiptError,
    receipt,
    hash,
    reset,
  };
}

/**
 * Add margin to an open position
 * @param {string} marketId - Market ID
 */
export function useAddMargin(marketId) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: SEPOLIA_CHAIN_ID });
  const { writeContract, writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isReceiptFetched,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const addMarginRaw = async (amountWei) => {
    const rawAmount = BigInt(amountWei);

    const request = {
      address: SEPOLIA_CONTRACTS.clearingHouse,
      abi: ClearingHouseABI.abi,
      functionName: "addMargin",
      args: [marketId, rawAmount],
      chainId: SEPOLIA_CHAIN_ID,
    };

    if (writeContractAsync) {
      return writeContractAsync(request);
    }

    return writeContract(request);
  };

  const addMargin = async (amount) => addMarginRaw(parseUnits(amount.toString(), 18));

  const simulateAddMarginRaw = async (amountWei) => {
    if (!address) throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("RPC client unavailable");
    return publicClient.simulateContract({
      address: SEPOLIA_CONTRACTS.clearingHouse,
      abi: ClearingHouseABI.abi,
      functionName: "addMargin",
      args: [marketId, BigInt(amountWei)],
      account: address,
    });
  };

  return {
    addMargin,
    addMarginRaw,
    simulateAddMarginRaw,
    isPending: isPending || isConfirming,
    isWalletPending: isPending,
    isConfirming,
    isReceiptFetched,
    isSuccess: receipt?.status === "success",
    isReverted: receipt?.status === "reverted",
    isReceiptError,
    error,
    receiptError,
    receipt,
    hash,
    reset,
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

  if (!data || !marketId) {
    return {
      riskParams: null,
      isLoading,
      error,
      refetch,
    };
  }

  // MarketRiskParams struct:
  // { imrBps, mmrBps, liquidationPenaltyBps, penaltyCap, maxPositionSize, minPositionSize }
  const imrBps                = data[0] || data.imrBps                || 0n;
  const mmrBps                = data[1] || data.mmrBps                || 0n;
  const liquidationPenaltyBps = data[2] || data.liquidationPenaltyBps || 0n;
  const penaltyCap            = data[3] || data.penaltyCap            || 0n;
  const maxPositionSize       = data[4] || data.maxPositionSize       || 0n;
  const minPositionSize       = data[5] || data.minPositionSize       || 0n;

  const riskParams = {
    imrBps:                   Number(imrBps),
    mmrBps:                   Number(mmrBps),
    liquidationPenaltyBps:    Number(liquidationPenaltyBps),
    penaltyCap:               formatUnits(penaltyCap, 18),
    penaltyCapRaw:            penaltyCap,
    maxPositionSize:          formatUnits(maxPositionSize, 18),
    maxPositionSizeRaw:       maxPositionSize,
    minPositionSize:          formatUnits(minPositionSize, 18),
    minPositionSizeRaw:       minPositionSize,
    imrPercent:               Number(imrBps) / 100,
    mmrPercent:               Number(mmrBps) / 100,
    liquidationPenaltyPercent: Number(liquidationPenaltyBps) / 100,
  };

  return {
    riskParams,
    isLoading,
    error,
    refetch,
  };
}

export function useReservedMarginForQuoteToken(quoteToken, userAddress = null) {
  const { address: connectedAddress } = useAccount();
  const addressToUse = userAddress || connectedAddress;
  const markets = MARKET_POSITION_CONFIG;

  const marketContracts = markets.map((market) => ({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: [market.marketId],
    chainId: SEPOLIA_CHAIN_ID,
  }));

  const positionContracts = markets.map((market) => ({
    address: SEPOLIA_CONTRACTS.clearingHouse,
    abi: ClearingHouseABI.abi,
    functionName: "getPosition",
    args: [addressToUse, market.marketId],
    chainId: SEPOLIA_CHAIN_ID,
  }));

  const { data: marketData, isLoading: marketsLoading } = useReadContracts({
    contracts: marketContracts,
    query: {
      enabled: !!quoteToken,
      refetchInterval: 30000,
    },
  });

  const { data: positionData, isLoading: positionsLoading, refetch } = useReadContracts({
    contracts: positionContracts,
    query: {
      enabled: !!addressToUse && !!quoteToken,
      refetchInterval: 5000,
    },
  });

  const normalizedQuoteToken = quoteToken?.toLowerCase();
  let reservedRaw = 0n;

  markets.forEach((_, index) => {
    const marketResult = marketData?.[index];
    const positionResult = positionData?.[index];
    if (marketResult?.status !== "success" || positionResult?.status !== "success") return;
    const marketQuoteToken = marketResult.result?.quoteToken ?? marketResult.result?.[7];
    if (!marketQuoteToken || marketQuoteToken.toLowerCase() !== normalizedQuoteToken) return;
    const margin = positionResult.result?.margin ?? positionResult.result?.[1] ?? 0n;
    reservedRaw += BigInt(margin);
  });

  return {
    reservedMargin: formatUnits(reservedRaw, 18),
    reservedMarginRaw: reservedRaw,
    isLoading: marketsLoading || positionsLoading,
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

  const {
    position,
    isLoading: isPositionLoading,
    error: positionError,
  } = usePosition(marketId, addressToUse);

  const {
    riskParams,
    isLoading: isRiskParamsLoading,
    error: riskParamsError,
  } = useMarketRiskParams(marketId);

  const { data: marketData, isLoading: isMarketLoading, error: marketError } = useReadContract({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: enabled ? [marketId] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled,
      refetchInterval: 30000,
    },
  });

  const oracleAddress = marketData?.oracle ?? marketData?.[3];
  const hasOpenPosition = Boolean(position?.hasPosition);

  const { data: oraclePrice, isLoading: isOracleLoading, error: oracleError } = useReadContract({
    address: oracleAddress,
    abi: ORACLE_PRICE_ABI,
    functionName: "getPrice",
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: enabled && hasOpenPosition && !!oracleAddress,
      refetchInterval: 5000,
    },
  });

  const { data: liquidationData, isLoading: isChecking, error: liquidationError } = useReadContract({
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

  const { data: notionalData, isLoading: isNotionalLoading, error: notionalError } = useReadContract({
    address: SEPOLIA_CONTRACTS.clearingHouse,
    abi: ClearingHouseABI.abi,
    functionName: "getNotional",
    args: enabled && hasOpenPosition ? [addressToUse, marketId] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: enabled && hasOpenPosition,
      refetchInterval: 5000,
    },
  });

  const { data: marginRatioData, isLoading: isMarginRatioLoading, error: marginRatioError } = useReadContract({
    address: SEPOLIA_CONTRACTS.clearingHouse,
    abi: ClearingHouseABI.abi,
    functionName: "getMarginRatio",
    args: enabled && hasOpenPosition ? [addressToUse, marketId] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: enabled && hasOpenPosition,
      refetchInterval: 5000,
    },
  });

  const positionSize = hasOpenPosition ? absBigInt(position.sizeRaw) : 0n;
  const mmrBps = BigInt(riskParams?.mmrBps ?? 0);
  const riskNotional = oraclePrice && positionSize > 0n
    ? mulDivRoundUp(positionSize, oraclePrice, WAD)
    : 0n;
  const maintenanceMarginRaw = riskNotional > 0n && mmrBps > 0n
    ? mulDivRoundUp(riskNotional, mmrBps, BPS_DENOMINATOR)
    : 0n;
  const notionalRaw = notionalData ?? 0n;
  const marginRatioRaw = marginRatioData ?? 0n;
  const effectiveMarginRaw =
    hasOpenPosition && marginRatioData !== undefined && marginRatioRaw !== UINT256_MAX
      ? (marginRatioRaw * notionalRaw) / WAD
      : (hasOpenPosition ? position.marginRaw ?? 0n : 0n);
  const liquidationBufferRaw = effectiveMarginRaw - maintenanceMarginRaw;

  return {
    isLiquidatable: liquidationData === true,
    maintenanceMargin: formatUnits(maintenanceMarginRaw, 18),
    maintenanceMarginRaw,
    liquidationBuffer: formatUnits(liquidationBufferRaw, 18),
    liquidationBufferRaw,
    effectiveMargin: formatUnits(effectiveMarginRaw, 18),
    effectiveMarginRaw,
    notional: formatUnits(notionalRaw, 18),
    notionalRaw,
    riskNotional: formatUnits(riskNotional, 18),
    riskNotionalRaw: riskNotional,
    riskPrice: oraclePrice ? formatUnits(oraclePrice, 18) : "0",
    riskPriceRaw: oraclePrice,
    isLoading:
      isPositionLoading ||
      isRiskParamsLoading ||
      isMarketLoading ||
      (hasOpenPosition && isOracleLoading) ||
      (hasOpenPosition && isNotionalLoading) ||
      (hasOpenPosition && isMarginRatioLoading) ||
      isChecking,
    error:
      positionError ||
      riskParamsError ||
      marketError ||
      oracleError ||
      notionalError ||
      marginRatioError ||
      liquidationError ||
      null,
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
