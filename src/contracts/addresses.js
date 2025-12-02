// ByteStrike Contract Addresses on Sepolia Testnet
// Chain ID: 11155111
// Latest Update: 2025-01-21 (ClearingHouse V3 - Decimal Fix Complete)

export const SEPOLIA_CONTRACTS = {
  // Core Protocol Contracts
  clearingHouse: '0x18F863b1b0A3Eca6B2235dc1957291E357f490B0', // ⭐ NEW: Fresh ClearingHouse (V5 - clean state, fixed negative portfolio)
  clearingHouseImpl: '0xB7c9ebEc73c45a4aE487bF5508976Ee70995b3b2', // V5 Implementation
  clearingHouseOld: '0x0BE85ed0948779a01efFB6b017ae87A4E9EB7FD6', // Deprecated (had stale storage)
  marketRegistry: '0x01D2bdbed2cc4eC55B0eA92edA1aAb47d57627fD', // Active registry
  collateralVault: '0x86A10164eB8F55EA6765185aFcbF5e073b249Dd2', // New vault (clean - only mUSDC)

  // vAMMs
  vammProxy: '0xF7210ccC245323258CC15e0Ca094eBbe2DC2CD85', // ⭐ ACTIVE: H100-PERP vAMM ($3.79/hour, IMR 10%, MMR 5%)
  vammImpl: '0xd64175cE957F089bA7fb3EBdA5B17f268DE01190', // vAMM implementation (latest)
  vammProxyOld: '0xF8908F7B4a1AaaD69bF0667FA83f85D3d0052739', // Old vAMM (deprecated)

  // Supporting Contracts
  insuranceFund: '0x3C1085dF918a38A95F84945E6705CC857b664074', // Active, funded
  feeRouter: '0xa75839A6D2Bb2f47FE98dc81EC47eaD01D4A2c1F', // Active

  // Oracles
  indexOracle: '0x3cA2Da03e4b6dB8fe5a24c22Cf5EB2A34B59cbad', // ⭐ ACTIVE: H100 GPU rental price oracle ($3.79/hour)
  oracle: '0x3cA2Da03e4b6dB8fe5a24c22Cf5EB2A34B59cbad', // Alias for index oracle
  collateralOracle: '0x7d1cc77Cb9C0a30a9aBB3d052A5542aB5E254c9c', // ⭐ ACTIVE: USDC price oracle for CollateralVault ($1.00)

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
  'H100-PERP': '0x2bc0c3f3ef82289c7da8a9335c83ea4f2b5b8bd62b67c4f4e0dba00b304c2937', // ⭐ ACTIVE: H100 GPU perpetual ($3.79/hour, IMR 10%, MMR 5%)
  'ETH-PERP-V2': '0x385badc5603eb47056a6bdcd6ac81a50df49d7a4e8a7451405e580bd12087a28', // Deprecated
  'ETH-PERP': '0x352291f10e3a0d4a9f7beb3b623eac0b06f735c95170f956bc68b2f8b504a35d', // Deprecated test market
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
    baseAsset: 'GPU-HOURS', // Trading H100 GPU compute hours
    quoteAsset: 'USDC',     // Collateral in USDC
    vamm: SEPOLIA_CONTRACTS.vammProxy,
    oracle: SEPOLIA_CONTRACTS.indexOracle, // H100 rental price oracle
    indexPrice: 3.79, // Current H100 GPU rental rate ($/hour)
    feeBps: 10, // 0.1% trading fee
    imrBps: 1000, // 10% Initial Margin Requirement
    mmrBps: 500, // 5% Maintenance Margin Requirement
    liquidationPenaltyBps: 250, // 2.5% Liquidation Penalty
    penaltyCap: 1000, // $1000 max penalty
    active: true,
    description: 'Perpetual futures on H100 GPU hourly rental rates with 10x max leverage',
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
