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

  // B200 Provider-Specific vAMMs
  vammProxyOracleB200: '0xB4D0f5be6ebd543354C7Ca7c5e4dD4DB4E094487', // ORACLE-B200-PERP vAMM ($6.47/hour)
  vammProxyAWSB200: '0x74171136e671916c58F413eC085ED1561c8EeE9B', // AWS-B200-PERP vAMM ($4.04/hour)
  vammProxyCoreWeaveB200: '0x377eA108a74466815b91943A0E924c10fe65Bc7D', // COREWEAVE-B200-PERP vAMM ($14.53/hour)
  vammProxyGCPB200: '0xb0e3d0F571d8F9a8FDDd477A0A09e1A232Ce7eC1', // GCP-B200-PERP vAMM ($6.60/hour)

  // H200 Provider-Specific vAMMs
  vammProxyOracleH200: '0x4bBA5dc77E1968681421F494048884b5933aF3c0', // ORACLE-H200-PERP vAMM ($2.92/hour)
  vammProxyAWSH200: '0x34C0673fA279CE7b7Ca964f7E6e6904efc3eBC56', // AWS-H200-PERP vAMM ($2.65/hour)
  vammProxyCoreWeaveH200: '0xc4BfB9f43aBFadbdD31b7CDa8fc7479b688b1452', // COREWEAVE-H200-PERP vAMM ($2.57/hour)
  vammProxyGCPH200: '0xb6e84d44C984564014dd2Ae4B8A9a3D32694AF02', // GCP-H200-PERP vAMM ($4.55/hour)
  vammProxyAzureH200: '0xEA15809884A8f2281017E7047d7d123268529FA2', // AZURE-H200-PERP vAMM ($5.05/hour)

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

  // B200 Provider-Specific Oracle Adapters
  oracleB200OracleAdapter: '0x0900dAAbcB5526AD24DB571290e5dD011d7E7A89', // Adapter for ORACLE-B200-PERP
  awsB200OracleAdapter: '0x627Cc930F049D3796a7752F31fD753dE47739f52', // Adapter for AWS-B200-PERP
  coreweaveB200OracleAdapter: '0x70Ca6c1459e8C1E40bb22735fdF0235dE679D7d0', // Adapter for COREWEAVE-B200-PERP
  gcpB200OracleAdapter: '0x1A894706568D427c6d7aBB11956B97f718e9c5c5', // Adapter for GCP-B200-PERP

  // H200 Provider-Specific Oracle Adapters
  oracleH200OracleAdapter: '0x4E3C71676e618e16175b52C9F4F7854105f21AE4', // Adapter for ORACLE-H200-PERP
  awsH200OracleAdapter: '0x649aa2edF7eB0eAd304F67D94c7CeE44bEA427ce', // Adapter for AWS-H200-PERP
  coreweaveH200OracleAdapter: '0x4A6Ee766Ec7e3b1d95Fc7c0945847A2C42215C54', // Adapter for COREWEAVE-H200-PERP
  gcpH200OracleAdapter: '0xaAF9bC42aEac437B16667122699cf97b093c4e4a', // Adapter for GCP-H200-PERP
  azureH200OracleAdapter: '0xFE8D7FC9304B06161992c78351723CFE44d86258', // Adapter for AZURE-H200-PERP

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

  // B200 Provider-Specific Markets
  'ORACLE-B200-PERP': '0x78b1dd5626222aef5d91e323da7cbe8941adb4eaaf0d1e90ac2dcee2680be01f', // Oracle Cloud B200 ($6.47/hour)
  'AWS-B200-PERP': '0x7e0ed16d08b6e36ae874386fd9c02a530e31026876a299a5ac59e9a8a7859c8e', // AWS B200 ($4.04/hour)
  'COREWEAVE-B200-PERP': '0x05b98a16e85afdd21369f8dde4ae197e2b445f37445b0e382ebcfdd10b711306', // CoreWeave B200 ($14.53/hour)
  'GCP-B200-PERP': '0xd0394d4ba76fe79cd0b954eb8e205df0cc4f08fb654dc916f5728d31c19f9305', // Google Cloud B200 ($6.60/hour)

  // H200 Provider-Specific Markets
  'ORACLE-H200-PERP': '0x61f05fafb6842941c9a7d6839378de32d97a2de181b4db0e276b8d2093b61866', // Oracle Cloud H200 ($2.92/hour)
  'AWS-H200-PERP': '0x12aa394c59dbf446e7ba1d3ab66f4629761c27d0dbacf484da0f4b205260c8fc', // AWS H200 ($2.65/hour)
  'COREWEAVE-H200-PERP': '0xf8444beb26f5f34e8d5ec6c988b1023100cd68287fa48066b54e428188ffa447', // CoreWeave H200 ($2.57/hour)
  'GCP-H200-PERP': '0xb654d9eedc69b55e0fe883d03cae37d13fdacc319a5a1f507bb33875e0e14201', // Google Cloud H200 ($4.55/hour)
  'AZURE-H200-PERP': '0xc845b4b5cdd753d1ad772bc105e5c4ddddff19c3da674c69da5c9f1a810bb872', // Azure H200 ($5.05/hour)

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

  // B200 Provider-Specific Asset IDs
  'ORACLE_B200_HOURLY': '0xf162ee5639707284e5b6a23eeb0b5d6627a935f1ff571463d1eb29e4e2800e6c', // keccak256("ORACLE_B200_HOURLY")
  'AWS_B200_HOURLY': '0xaea03c0d396f0037b42610d8306208c650a1390eba181b60426a65fb244e4b96', // keccak256("AWS_B200_HOURLY")
  'COREWEAVE_B200_HOURLY': '0x67a96f399341b1228769fdb687640ca37844b30f83f09a6de6e06888876a29d1', // keccak256("COREWEAVE_B200_HOURLY")
  'GCP_B200_HOURLY': '0xe54dd81ff75d2b3f55dc0203f393dda742a93a45a42f8c7e726fd47d639dfd27', // keccak256("GCP_B200_HOURLY")

  // H200 Provider-Specific Asset IDs
  'ORACLE_H200_HOURLY': '0x5d5f627ba6daf1427a1559c3200cbe7ebf105d0df0ec1610c6b89d54a314bf51', // keccak256("ORACLE_H200_HOUR")
  'AWS_H200_HOURLY': '0xb377854a672b5274c99b24e7fe27d9661c60c8b697ca4f974208162655716b3e', // keccak256("AWS_H200_HOUR")
  'COREWEAVE_H200_HOURLY': '0xa05f2ef65a5f11da36153346f35e9cdb554962e858a95c7f79075cd3a4c6ddfd', // keccak256("COREWEAVE_H200_HOUR")
  'GCP_H200_HOURLY': '0x0ba2d87db04ca970c41ab4334516ce12e74356d71ee96e228fb1ba5d519aaaf4', // keccak256("GCP_H200_HOUR")
  'AZURE_H200_HOURLY': '0x12b283ae476f0251b7a6eaa8d414a3260644e167d9253ef1e72d49e2c8291e61', // keccak256("AZURE_H200_HOUR")
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
  'ORACLE-B200-PERP': {
    id: MARKET_IDS['ORACLE-B200-PERP'],
    name: 'ORACLE-B200-PERP',
    displayName: 'Oracle Cloud B200 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyOracleB200,
    oracle: SEPOLIA_CONTRACTS.oracleB200OracleAdapter,
    indexPrice: 6.47,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on Oracle Cloud B200 GPU hourly rental rates with 10x max leverage',
  },
  'AWS-B200-PERP': {
    id: MARKET_IDS['AWS-B200-PERP'],
    name: 'AWS-B200-PERP',
    displayName: 'AWS B200 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyAWSB200,
    oracle: SEPOLIA_CONTRACTS.awsB200OracleAdapter,
    indexPrice: 4.04,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on AWS B200 GPU hourly rental rates with 10x max leverage',
  },
  'COREWEAVE-B200-PERP': {
    id: MARKET_IDS['COREWEAVE-B200-PERP'],
    name: 'COREWEAVE-B200-PERP',
    displayName: 'CoreWeave B200 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyCoreWeaveB200,
    oracle: SEPOLIA_CONTRACTS.coreweaveB200OracleAdapter,
    indexPrice: 14.53,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on CoreWeave B200 GPU hourly rental rates with 10x max leverage',
  },
  'GCP-B200-PERP': {
    id: MARKET_IDS['GCP-B200-PERP'],
    name: 'GCP-B200-PERP',
    displayName: 'Google Cloud B200 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyGCPB200,
    oracle: SEPOLIA_CONTRACTS.gcpB200OracleAdapter,
    indexPrice: 6.60,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on Google Cloud B200 GPU hourly rental rates with 10x max leverage',
  },
  'ORACLE-H200-PERP': {
    id: MARKET_IDS['ORACLE-H200-PERP'],
    name: 'ORACLE-H200-PERP',
    displayName: 'Oracle Cloud H200 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyOracleH200,
    oracle: SEPOLIA_CONTRACTS.oracleH200OracleAdapter,
    indexPrice: 2.92,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on Oracle Cloud H200 GPU hourly rental rates with 10x max leverage',
  },
  'AWS-H200-PERP': {
    id: MARKET_IDS['AWS-H200-PERP'],
    name: 'AWS-H200-PERP',
    displayName: 'AWS H200 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyAWSH200,
    oracle: SEPOLIA_CONTRACTS.awsH200OracleAdapter,
    indexPrice: 2.65,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on AWS H200 GPU hourly rental rates with 10x max leverage',
  },
  'COREWEAVE-H200-PERP': {
    id: MARKET_IDS['COREWEAVE-H200-PERP'],
    name: 'COREWEAVE-H200-PERP',
    displayName: 'CoreWeave H200 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyCoreWeaveH200,
    oracle: SEPOLIA_CONTRACTS.coreweaveH200OracleAdapter,
    indexPrice: 2.57,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on CoreWeave H200 GPU hourly rental rates with 10x max leverage',
  },
  'GCP-H200-PERP': {
    id: MARKET_IDS['GCP-H200-PERP'],
    name: 'GCP-H200-PERP',
    displayName: 'Google Cloud H200 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyGCPH200,
    oracle: SEPOLIA_CONTRACTS.gcpH200OracleAdapter,
    indexPrice: 4.55,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on Google Cloud H200 GPU hourly rental rates with 10x max leverage',
  },
  'AZURE-H200-PERP': {
    id: MARKET_IDS['AZURE-H200-PERP'],
    name: 'AZURE-H200-PERP',
    displayName: 'Azure H200 GPU Perpetual',
    baseAsset: 'GPU-HOURS',
    quoteAsset: 'USDC',
    vamm: SEPOLIA_CONTRACTS.vammProxyAzureH200,
    oracle: SEPOLIA_CONTRACTS.azureH200OracleAdapter,
    indexPrice: 5.05,
    feeBps: 10,
    imrBps: 1000,
    mmrBps: 500,
    liquidationPenaltyBps: 250,
    penaltyCap: 1000,
    active: true,
    description: 'Perpetual futures on Azure H200 GPU hourly rental rates with 10x max leverage',
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
