// Hooks for vAMM contract interactions
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits, formatUnits } from 'ethers';
import { SEPOLIA_CONTRACTS } from '../contracts/addresses';
import VAMMABI from '../contracts/abis/vAMM.json';

const SEPOLIA_CHAIN_ID = 11155111;

/**
 * Get the current mark price from vAMM
 * @param {string} vammAddress - vAMM contract address (defaults to main vAMM)
 * @param {number} refetchInterval - How often to refetch in ms (default: 5000)
 */
export function useMarkPrice(vammAddress = SEPOLIA_CONTRACTS.vammProxy, refetchInterval = 5000) {
  const chainId = useChainId();

  const { data, isLoading, error, refetch } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'getMarkPrice', // Fixed: was getMarkPriceX18
    chainId: SEPOLIA_CHAIN_ID, // Force Sepolia chain
    query: {
      refetchInterval,
      enabled: !!vammAddress, // Only run if address exists
    },
  });

  // Log errors for debugging
  if (error) {
    console.error('useMarkPrice error:', error);
  }

  // Warn if on wrong chain
  if (chainId && chainId !== SEPOLIA_CHAIN_ID) {
    console.warn(`⚠️ Wrong network! Connected to chain ${chainId}, but contracts are on Sepolia (${SEPOLIA_CHAIN_ID}). Please switch to Sepolia network.`);
  }

  const price = data ? formatUnits(data, 18) : '0';

  return {
    price,
    priceRaw: data,
    isLoading,
    error,
    refetch
  };
}

/**
 * Get vAMM reserves (base and quote)
 * @param {string} vammAddress - vAMM contract address
 */
export function useVAMMReserves(vammAddress = SEPOLIA_CONTRACTS.vammProxy) {
  const { data: baseReserve } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'reserveBase',
  });

  const { data: quoteReserve } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'reserveQuote',
  });

  return {
    baseReserve: baseReserve ? formatUnits(baseReserve, 18) : '0',
    quoteReserve: quoteReserve ? formatUnits(quoteReserve, 18) : '0',
    baseReserveRaw: baseReserve,
    quoteReserveRaw: quoteReserve,
  };
}

/**
 * Get TWAP (Time-Weighted Average Price)
 * @param {string} vammAddress - vAMM contract address
 * @param {number} window - TWAP window in seconds
 */
export function useTWAP(vammAddress = SEPOLIA_CONTRACTS.vammProxy, window = 900) {
  const { data, isLoading } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'getTwap',
    args: [window],
    chainId: SEPOLIA_CHAIN_ID, // Force Sepolia chain
    query: {
      refetchInterval: 10000, // Refetch every 10s
    },
  });

  const twap = data ? formatUnits(data, 18) : '0';

  return { twap, twapRaw: data, isLoading };
}

/**
 * Get funding rate information
 * @param {string} vammAddress - vAMM contract address
 */
export function useFundingRate(vammAddress = SEPOLIA_CONTRACTS.vammProxy) {
  const { data: cumulativeFunding } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'cumulativeFundingPerUnitX18', // Fixed: was cumulativeFundingRateX18
    chainId: SEPOLIA_CHAIN_ID, // Force Sepolia chain
    query: {
      refetchInterval: 30000, // Refetch every 30s
    },
  });

  const { data: lastFundingTime } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'lastFundingTimestamp', // Fixed: was lastFundingTime
    chainId: SEPOLIA_CHAIN_ID, // Force Sepolia chain
  });

  return {
    cumulativeFunding: cumulativeFunding ? formatUnits(cumulativeFunding, 18) : '0',
    lastFundingTime: lastFundingTime ? Number(lastFundingTime) : 0,
    cumulativeFundingRaw: cumulativeFunding,
  };
}

/**
 * Swap base for quote (go long)
 * @param {string} vammAddress - vAMM contract address
 */
export function useSwapBaseForQuote(vammAddress = SEPOLIA_CONTRACTS.vammProxy) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const swap = (amountIn, minAmountOut, to) => {
    const amountInWei = parseUnits(amountIn.toString(), 18);
    const minAmountOutWei = parseUnits(minAmountOut.toString(), 18);

    writeContract({
      address: vammAddress,
      abi: VAMMABI.abi,
      functionName: 'swapBaseForQuote',
      args: [amountInWei, minAmountOutWei, to],
    });
  };

  return {
    swap,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Swap quote for base (go short)
 * @param {string} vammAddress - vAMM contract address
 */
export function useSwapQuoteForBase(vammAddress = SEPOLIA_CONTRACTS.vammProxy) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const swap = (amountIn, minAmountOut, to) => {
    const amountInWei = parseUnits(amountIn.toString(), 18);
    const minAmountOutWei = parseUnits(minAmountOut.toString(), 18);

    writeContract({
      address: vammAddress,
      abi: VAMMABI.abi,
      functionName: 'swapQuoteForBase',
      args: [amountInWei, minAmountOutWei, to],
    });
  };

  return {
    swap,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Sell base for quote (close long position)
 * @param {string} vammAddress - vAMM contract address
 */
export function useSwapSellBaseForQuote(vammAddress = SEPOLIA_CONTRACTS.vammProxy) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const swap = (amountIn, minAmountOut, to) => {
    const amountInWei = parseUnits(amountIn.toString(), 18);
    const minAmountOutWei = parseUnits(minAmountOut.toString(), 18);

    writeContract({
      address: vammAddress,
      abi: VAMMABI.abi,
      functionName: 'swapSellBaseForQuote',
      args: [amountInWei, minAmountOutWei, to],
    });
  };

  return {
    swap,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Poke funding (update funding rate)
 * @param {string} vammAddress - vAMM contract address
 */
export function usePokeFunding(vammAddress = SEPOLIA_CONTRACTS.vammProxy) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const poke = () => {
    writeContract({
      address: vammAddress,
      abi: VAMMABI.abi,
      functionName: 'pokeFunding',
    });
  };

  return {
    poke,
    isPending: isPending || isConfirming,
    isSuccess,
    hash,
  };
}
