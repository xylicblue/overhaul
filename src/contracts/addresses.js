// ByteStrike Contract Addresses on Sepolia Testnet
// Chain ID: 11155111
// Latest Update: 2025-12-16 (Added HyperScalers & non-HyperScalers markets)

export const SEPOLIA_CONTRACTS = {
  // Core Protocol Contracts
  clearingHouse: '0x18F863b1b0A3Eca6B2235dc1957291E357f490B0', // ⭐ NEW: Fresh ClearingHouse (V5 - clean state, fixed negative portfolio)
  clearingHouseImpl: '0xB7c9ebEc73c45a4aE487bF5508976Ee70995b3b2', // V5 Implementation
  clearingHouseOld: '0x0BE85ed0948779a01efFB6b017ae87A4E9EB7FD6', // Deprecated (had stale storage)
  marketRegistry: '0x01D2bdbed2cc4eC55B0eA92edA1aAb47d57627fD', // Active registry
  collateralVault: '0x86A10164eB8F55EA6765185aFcbF5e073b249Dd2', // New vault (clean - only mUSDC)

  // vAMMs
  vammProxy: '0xF7210ccC245323258CC15e0Ca094eBbe2DC2CD85', // H100-PERP vAMM ($3.79/hour)
  vammProxyHyperscalers: '0xFE1df531084Dcf0Fe379854823bC5d402932Af99', // H100-HyperScalers-PERP vAMM ($4.20/hour)
  vammProxyNonHyperscalers: '0x19574B8C91717389231DA5b0579564d6F81a79B0', // H100-non-HyperScalers-PERP vAMM ($2.95/hour)
  vammProxyB200: '0xaE8F8a5BE8eFdaa18e7135F7e467a8965d7209e1', // B200-PERP vAMM ($7.15/hour)
  vammProxyH200: '0x58dE5e38F6F927a59166B65a4D8beb425180b5E1', // H200-PERP vAMM ($3.53/hour)
  vammImpl: '0xd64175cE957F089bA7fb3EBdA5B17f268DE01190', // vAMM implementation (latest)
  vammProxyOld: '0xF8908F7B4a1AaaD69bF0667FA83f85D3d0052739', // Old vAMM (deprecated)

  // Supporting Contracts
  insuranceFund: '0x3C1085dF918a38A95F84945E6705CC857b664074', // Active, funded
  feeRouter: '0xa75839A6D2Bb2f47FE98dc81EC47eaD01D4A2c1F', // Active

  // Oracles - New MultiAssetOracle Infrastructure
  multiAssetOracle: '0xB44d652354d12Ac56b83112c6ece1fa2ccEfc683', // Shared oracle for all GPU markets
  h100OracleAdapter: '0xc3AB908634253b961bC61Aa0A846F3fc05e271D8', // Adapter for H100-PERP
  hyperscalersOracleAdapter: '0x41Fa5925b709936D533e5E1a47dd8d4C64E7C77B', // Adapter for H100-HyperScalers-PERP
  nonHyperscalersOracleAdapter: '0xE6A1d2B4DC450C50ce00fc12FBbAf362c8B0EdFD', // Adapter for H100-non-HyperScalers-PERP
  b200OracleAdapter: '0xb2Ba756BaC4a1365cA81145E7CFF3b456d24D584', // Adapter for B200-PERP
  h200OracleAdapter: '0x9e399C811A2a4761Ec43e3D38367c9Bb9eEDdEc7', // Adapter for H200-PERP

  // Oracles - Legacy (will be deprecated after migration)
  indexOracle: '0x3cA2Da03e4b6dB8fe5a24c22Cf5EB2A34B59cbad', // Legacy: H100 GPU rental price oracle
  oracle: '0x3cA2Da03e4b6dB8fe5a24c22Cf5EB2A34B59cbad', // Alias for index oracle
  collateralOracle: '0x7d1cc77Cb9C0a30a9aBB3d052A5542aB5E254c9c', // USDC price oracle for CollateralVault ($1.00)

  // Deprecated oracles (for reference)
  simpleETHOracle: '0x5d57118594a8b1C3Aa3dbA1f0A18a6744f531096', // Deprecated
  updatableETHOracle: '0xC6Cb27fE8Bc7F936acD718dfd1D6E0592F69A028', // Deprecated

  // Mock Tokens (for testing)
  mockUSDC: '0x8C68933688f94BF115ad2F9C8c8e251AE5d4ade7', // Active
  usdc: '0x8C68933688f94BF115ad2F9C8c8e251AE5d4ade7', // Alias for compatibility
  mockWETH: '0xc696f32d4F8219CbA41bcD5C949b2551df13A7d6', // Active
};

// Market IDs (keccak256 of market parameters)
export const MARKET_IDS = {
  'H100-PERP': '0x2bc0c3f3ef82289c7da8a9335c83ea4f2b5b8bd62b67c4f4e0dba00b304c2937', // H100 GPU perpetual ($3.79/hour)
  'H100-HyperScalers-PERP': '0xf4aa47cc83b0d01511ca8025a996421dda6fbab1764466da4b0de6408d3db2e2', // H100 HyperScalers ($4.20/hour)
  'H100-non-HyperScalers-PERP': '0x9d2d658888da74a10ac9263fc14dcac4a834dd53e8edf664b4cc3b2b4a23f214', // H100 non-HyperScalers ($2.95/hour)
  'B200-PERP': '0xb4be6bdaf765a9dc45759a99c834b32d12825dce59bc28052946c1f1267a999b', // B200 GPU perpetual ($7.15/hour)
  'H200-PERP': '0x3b9736717eab3427f776c56345a626690c13be77aa87cb6858bf92d50ad0c998', // H200 GPU perpetual ($3.53/hour)
  'ETH-PERP-V2': '0x385badc5603eb47056a6bdcd6ac81a50df49d7a4e8a7451405e580bd12087a28', // Deprecated
  'ETH-PERP': '0x352291f10e3a0d4a9f7beb3b623eac0b06f735c95170f956bc68b2f8b504a35d', // Deprecated test market
};

// Asset IDs for MultiAssetOracle (for bot integration)
export const ASSET_IDS = {
  'H100_HOURLY': '0x82af7da7090d6235dbc9f8cfccfb82eee2e9cb33d50be18eabf66c158261796a', // keccak256("H100_HOURLY")
  'H100_HYPERSCALERS_HOURLY': '0x4907d2c1e61b87a99a260f8529c3c4f9e2374edae1f5ab1464a8e79d0f2c26de', // keccak256("H100_HYPERSCALERS_HOURLY")
  'H100_NON_HYPERSCALERS_HOURLY': '0xd6e43f59d2c94773a52e2c20f09762901247d1aaf2090d0b99e85c55c9833626', // keccak256("H100_NON_HYPERSCALERS_HOURLY")
  'B200_HOURLY': '0xc087ecb79f2df80d1dbf828d80ca18ff0b385e5806b3ec42da93e23eb0136348', // keccak256("B200_HOURLY")
  'H200_HOURLY': '0x4d8595569ab5d2563e4c149c5de961d0e0732cd0560020b3474d281189c2571e', // keccak256("H200_HOURLY")
};

// Default market to use in the frontend
export const DEFAULT_MARKET_ID = MARKET_IDS['H100-PERP']; // Active market: H100 GPU rental @ $3.79/hour

// Implementation Contracts (for reference)
export const IMPLEMENTATIONS = {
  clearingHouseV5: '0xB7c9ebEc73c45a4aE487bF5508976Ee70995b3b2', // Current (2025-11-28) - Fresh deployment with clean state
  clearingHouseV4: '0x56a18F7b3348bd35512CCb6710e55344E4Bddc85', // Deprecated (had stale storage)
  clearingHouseV3: '0x02d8dcE5A4CF10FcE80F9479d379229ECB08937d', // Deprecated (2025-01-21)
  clearingHouseV2: '0x2EC22b3e3AC4Bc5427dCA20B70746de6E663f187', // Deprecated
  vammImpl: '0x2B83ca8210cCe6CB14Bc0cFdA2CDFD83021D743b', // Current
};

// Supported collateral tokens
export const COLLATERAL_TOKENS = [
  {
    address: '0x8C68933688f94BF115ad2F9C8c8e251AE5d4ade7',
    symbol: 'mUSDC',
    name: 'Mock USDC',
    decimals: 6,
    icon: '💵',
  },
  {
    address: '0xc696f32d4F8219CbA41bcD5C949b2551df13A7d6',
    symbol: 'mWETH',
    name: 'Mock Wrapped Ether',
    decimals: 18,
    icon: '⟠',
  },
];

// Market Configuration
export const MARKETS = {
  'H100-PERP': {
    id: MARKET_IDS['H100-PERP'],
    name: 'H100-PERP',
    displayName: 'H100 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxy,
    oracle: SEPOLIA_CONTRACTS.h100OracleAdapter || SEPOLIA_CONTRACTS.indexOracle, // Uses new adapter after migration
    indexPrice: 3.79,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on H100 GPU hourly rental rates (all providers) with 10x max leverage',
  },
  'H100-HyperScalers-PERP': {
    id: MARKET_IDS['H100-HyperScalers-PERP'],
    name: 'H100-HyperScalers-PERP',
    displayName: 'H100 HyperScalers GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyHyperscalers,
    oracle: SEPOLIA_CONTRACTS.hyperscalersOracleAdapter,
    indexPrice: 4.202163309021113,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on H100 GPU hourly rental rates from HyperScalers (AWS, GCP, Azure) with 10x max leverage',
  },
  'H100-non-HyperScalers-PERP': {
    id: MARKET_IDS['H100-non-HyperScalers-PERP'],
    name: 'H100-non-HyperScalers-PERP',
    displayName: 'H100 non-HyperScalers GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyNonHyperscalers,
    oracle: SEPOLIA_CONTRACTS.nonHyperscalersOracleAdapter,
    indexPrice: 2.94624309275419,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on H100 GPU hourly rental rates from non-HyperScalers (Lambda, CoreWeave, etc.) with 10x max leverage',
  },
  'B200-PERP': {
    id: MARKET_IDS['B200-PERP'],
    name: 'B200-PERP',
    displayName: 'B200 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyB200,
    oracle: SEPOLIA_CONTRACTS.b200OracleAdapter,
    indexPrice: 7.15,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on B200 GPU hourly rental rates with 10x max leverage',
  },
  'H200-PERP': {
    id: MARKET_IDS['H200-PERP'],
    name: 'H200-PERP',
    displayName: 'H200 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyH200,
    oracle: SEPOLIA_CONTRACTS.h200OracleAdapter,
    indexPrice: 3.53,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on H200 GPU hourly rental rates with 10x max leverage',
  },
};

// Chain configuration
export const CHAIN_CONFIG = {
  chainId: 11155111,
  name: 'Sepolia',
  rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY', // Replace with your RPC
  blockExplorer: 'https://sepolia.etherscan.io',
};

// Deployment History
export const DEPLOYMENT_HISTORY = {
  'fresh-clearinghouse-2025-11-28': {
    date: '2025-11-28',
    description: 'Fresh ClearingHouse deployment to fix stale storage from vault migration',
    proxy: '0x18F863b1b0A3Eca6B2235dc1957291E357f490B0',
    implementation: '0xB7c9ebEc73c45a4aE487bF5508976Ee70995b3b2',
    changes: [
      'Deployed new ClearingHouse proxy with clean state',
      'Fixed negative portfolio values (was -$24.7M)',
      'Connected to new CollateralVault (0x86A10164...)',
      'No stale _totalReservedMargin mappings',
      'Users must redeposit collateral to start trading',
      'Added adminClearStuckPosition() emergency function',
    ],
    deprecated: {
      oldProxy: '0x0BE85ed0948779a01efFB6b017ae87A4E9EB7FD6',
      reason: 'Stale storage from vault migration caused negative portfolio values',
    },
  },
  'h100-perp-2025-11-27': {
    date: '2025-11-27',
    description: 'New H100-PERP market with proper risk parameters',
    vammProxy: '0xF7210ccC245323258CC15e0Ca094eBbe2DC2CD85',
    vammImpl: '0xd64175cE957F089bA7fb3EBdA5B17f268DE01190',
    marketId: '0x2bc0c3f3ef82289c7da8a9335c83ea4f2b5b8bd62b67c4f4e0dba00b304c2937',
    changes: [
      'Deployed new vAMM with $3.79/hour H100 GPU pricing',
      'Set IMR to 10% (1000 bps) for 10x max leverage',
      'Set MMR to 5% (500 bps)',
      'Set liquidation penalty to 2.5% (250 bps) with $1000 cap',
      'Trading fee: 0.1% (10 bps)',
      'Connected to existing ClearingHouse, MarketRegistry, and CollateralVault',
    ],
  },
  v3: {
    date: '2025-01-21',
    description: 'Fixed FeeRouter notification with correct decimals',
    implementation: '0x02d8dcE5A4CF10FcE80F9479d379229ECB08937d',
    changes: [
      'FeeRouter receives converted decimal amounts',
      'Insurance fund payouts use correct decimals',
      'Successfully tested position opening',
    ],
  },
  v2: {
    date: '2025-01-21',
    description: 'Added decimal conversion in fee collection',
    implementation: '0x2EC22b3e3AC4Bc5427dCA20B70746de6E663f187',
    changes: [
      'Fees converted from 1e18 to quote decimals (1e6 for USDC)',
    ],
  },
};

// Helper function to get contract address by name
export function getContractAddress(contractName) {
  return SEPOLIA_CONTRACTS[contractName];
}

// Helper to check if we're on the correct network
export function isCorrectNetwork(chainId) {
  return chainId === CHAIN_CONFIG.chainId;
}

// Helper to get Etherscan link
export function getEtherscanLink(address, type = 'address') {
  return `${CHAIN_CONFIG.blockExplorer}/${type}/${address}`;
}

// Helper to get transaction link
export function getTxLink(hash) {
  return getEtherscanLink(hash, 'tx');
}

// Helper to get market by ID
export function getMarketById(marketId) {
  return Object.values(MARKETS).find(m => m.id === marketId);
}

// Helper to get active markets
export function getActiveMarkets() {
  return Object.values(MARKETS).filter(m => m.active);
}
