// Hooks for vAMM contract interactions
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { formatUnits } from 'ethers';
import { SEPOLIA_CONTRACTS } from '../contracts/addresses';
import VAMMABI from '../contracts/abis/vAMM.json';

const SEPOLIA_CHAIN_ID = 11155111;

const formatX18 = (value) => (value == null ? '0' : formatUnits(value, 18));

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

  const price = formatX18(data);

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
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: vammAddress,
        abi: VAMMABI.abi,
        functionName: 'getReserves',
        chainId: SEPOLIA_CHAIN_ID,
      },
      {
        address: vammAddress,
        abi: VAMMABI.abi,
        functionName: 'minReserveBase',
        chainId: SEPOLIA_CHAIN_ID,
      },
      {
        address: vammAddress,
        abi: VAMMABI.abi,
        functionName: 'minReserveQuote',
        chainId: SEPOLIA_CHAIN_ID,
      },
      {
        address: vammAddress,
        abi: VAMMABI.abi,
        functionName: 'feeBps',
        chainId: SEPOLIA_CHAIN_ID,
      },
    ],
    query: {
      refetchInterval: 10000,
      enabled: !!vammAddress,
    },
  });

  const reserves = data?.[0]?.status === 'success' ? data[0].result : [];
  const [baseReserve, quoteReserve] = reserves || [];
  const minReserveBase = data?.[1]?.status === 'success' ? data[1].result : 0n;
  const minReserveQuote = data?.[2]?.status === 'success' ? data[2].result : 0n;
  const feeBps = data?.[3]?.status === 'success' ? data[3].result : 0n;

  return {
    baseReserve: formatX18(baseReserve),
    quoteReserve: formatX18(quoteReserve),
    baseReserveRaw: baseReserve,
    quoteReserveRaw: quoteReserve,
    minReserveBase: formatX18(minReserveBase),
    minReserveQuote: formatX18(minReserveQuote),
    minReserveBaseRaw: minReserveBase,
    minReserveQuoteRaw: minReserveQuote,
    feeBps: feeBps ? Number(feeBps) : 0,
    feeBpsRaw: feeBps,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get funding rate information
 * @param {string} vammAddress - vAMM contract address
 */
export function useFundingRate(vammAddress = SEPOLIA_CONTRACTS.vammProxy) {
  const { data: longPayRaw } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'currentCumulativeLongPayPerUnitX18',
    chainId: SEPOLIA_CHAIN_ID,
    query: { refetchInterval: 30000, enabled: !!vammAddress },
  });

  const { data: longReceiveRaw } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'currentCumulativeLongReceivePerUnitX18',
    chainId: SEPOLIA_CHAIN_ID,
    query: { refetchInterval: 30000, enabled: !!vammAddress },
  });

  const { data: shortPayRaw } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'currentCumulativeShortPayPerUnitX18',
    chainId: SEPOLIA_CHAIN_ID,
    query: { refetchInterval: 30000, enabled: !!vammAddress },
  });

  const { data: shortReceiveRaw } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'currentCumulativeShortReceivePerUnitX18',
    chainId: SEPOLIA_CHAIN_ID,
    query: { refetchInterval: 30000, enabled: !!vammAddress },
  });

  const { data: lastFundingTime } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'lastFundingTimestamp',
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: !!vammAddress },
  });

  const { data: kFundingRaw } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'kFundingX18',
    chainId: SEPOLIA_CHAIN_ID,
    query: { refetchInterval: 60000, enabled: !!vammAddress },
  });

  const { data: frMaxBpsPerHourRaw } = useReadContract({
    address: vammAddress,
    abi: VAMMABI.abi,
    functionName: 'frMaxBpsPerHour',
    chainId: SEPOLIA_CHAIN_ID,
    query: { refetchInterval: 60000, enabled: !!vammAddress },
  });

  const longPay = formatX18(longPayRaw);
  const longReceive = formatX18(longReceiveRaw);
  const shortPay = formatX18(shortPayRaw);
  const shortReceive = formatX18(shortReceiveRaw);

  return {
    // Existing position consumers still read cumulativeFunding; expose it from
    // the current long-pay index without calling removed contract methods.
    cumulativeFunding: longPay,
    lastFundingTime: lastFundingTime ? Number(lastFundingTime) : 0,
    kFundingX18: formatX18(kFundingRaw),
    frMaxBpsPerHour: frMaxBpsPerHourRaw ? Number(frMaxBpsPerHourRaw) : 0,
    cumulativeFundingRaw: longPayRaw,
    longPay,
    longReceive,
    shortPay,
    shortReceive,
    longPayRaw,
    longReceiveRaw,
    shortPayRaw,
    shortReceiveRaw,
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
