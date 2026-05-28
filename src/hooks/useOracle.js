// Hook for Oracle contract interactions
import { useReadContract, useReadContracts, useChainId } from 'wagmi';
import { formatUnits } from 'ethers';
import { SEPOLIA_CONTRACTS } from '../contracts/addresses';

const SEPOLIA_CHAIN_ID = 11155111;

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
  },
  {
    "inputs": [],
    "name": "cuOracle",
    "outputs": [{ "internalType": "contract CuOracle", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "assetId",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const CU_ORACLE_ABI = [
  {
    "inputs": [{ "internalType": "bytes32", "name": "_assetId", "type": "bytes32" }],
    "name": "getLatestPrice",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "price", "type": "uint256" },
          { "internalType": "uint256", "name": "lastUpdatedAt", "type": "uint256" }
        ],
        "internalType": "struct CuOracle.PriceData",
        "name": "",
        "type": "tuple"
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

  const { data: adapterMeta } = useReadContracts({
    contracts: [
      {
        address: oracleAddress,
        abi: ORACLE_ABI,
        functionName: 'cuOracle',
        chainId: SEPOLIA_CHAIN_ID,
      },
      {
        address: oracleAddress,
        abi: ORACLE_ABI,
        functionName: 'assetId',
        chainId: SEPOLIA_CHAIN_ID,
      },
    ],
    query: {
      enabled: !!oracleAddress,
      refetchInterval,
    },
  });

  const cuOracleAddress = adapterMeta?.[0]?.status === 'success' ? adapterMeta[0].result : undefined;
  const assetId = adapterMeta?.[1]?.status === 'success' ? adapterMeta[1].result : undefined;

  const { data: latestPriceData, isLoading: latestLoading, error: latestError } = useReadContract({
    address: cuOracleAddress,
    abi: CU_ORACLE_ABI,
    functionName: 'getLatestPrice',
    args: assetId ? [assetId] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      refetchInterval,
      enabled: !!cuOracleAddress && !!assetId,
    },
  });

  // Warn if on wrong chain
  if (chainId && chainId !== SEPOLIA_CHAIN_ID) {
    console.warn(`⚠️ Wrong network! Connected to chain ${chainId}, but contracts are on Sepolia (${SEPOLIA_CHAIN_ID}). Please switch to Sepolia network.`);
  }

  const fallbackPriceRaw = latestPriceData?.price ?? latestPriceData?.[0];
  const latestUpdatedAt = latestPriceData?.lastUpdatedAt ?? latestPriceData?.[1];
  const priceRaw = data || fallbackPriceRaw;
  const price = priceRaw ? formatUnits(priceRaw, 18) : '0';

  if (!priceRaw && error) {
    console.error('useOraclePrice error:', error);
  }

  return {
    price,
    priceRaw,
    latestUpdatedAt: latestUpdatedAt ? Number(latestUpdatedAt) : 0,
    isStale: !data && !!fallbackPriceRaw,
    isLoading: isLoading || (!!oracleAddress && !priceRaw && latestLoading),
    error: priceRaw ? null : (error || latestError),
    refetch
  };
}
