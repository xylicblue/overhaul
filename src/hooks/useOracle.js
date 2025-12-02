// Hook for Oracle contract interactions
import { useReadContract, useChainId } from 'wagmi';
import { formatUnits } from 'ethers';
import { SEPOLIA_CONTRACTS } from '../contracts/addresses';

const SEPOLIA_CHAIN_ID = 11155111;

// Minimal Oracle ABI - just the getPrice function
const ORACLE_ABI = [
  {
    "inputs": [],
    "name": "getPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Get the current oracle (index) price
 * @param {string} oracleAddress - Oracle contract address (defaults to Sepolia oracle)
 * @param {number} refetchInterval - How often to refetch in ms (default: 10000)
 */
export function useOraclePrice(oracleAddress = SEPOLIA_CONTRACTS.cuOracleAdapter, refetchInterval = 10000) {
  const chainId = useChainId();

  const { data, isLoading, error, refetch } = useReadContract({
    address: oracleAddress,
    abi: ORACLE_ABI,
    functionName: 'getPrice',
    chainId: SEPOLIA_CHAIN_ID, // Force Sepolia chain
    query: {
      refetchInterval,
      enabled: !!oracleAddress, // Only run if address exists
    },
  });

  // Log errors for debugging
  if (error) {
    console.error('useOraclePrice error:', error);
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
