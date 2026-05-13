// ByteStrike Contract Addresses on Sepolia
// Chain ID: 11155111
// Latest update: 2026-05-08
// Source: sepolia_updated_addresses.md

export const SEPOLIA_CONTRACTS = {
  deployerTreasury: "0xCc624fFA5df1F3F4b30aa8abd30186a86254F406",

  clearingHouse: "0xDf4DDD4019097B335dD507f916984A1A53E40a0d",
  clearingHouseProxy: "0xDf4DDD4019097B335dD507f916984A1A53E40a0d",
  clearingHouseImpl: "0x914F7C5E7f870E3E77ce4d7AC6ba5cDf82f81873",
  clearingHouseLogic: "0x8a7FD495fECBc46e427A309d0f3cC5FC9355860d",

  collateralVault: "0x44345dFCD97973329A88aaE8c1432ea90525Ed13",
  marketRegistry: "0x236b75D39203506ee3180Ef2E1c7460a188C43c6",
  feeRouter: "0xBCEA366b30eb1dcAC6968AECcc215E8797553a5e",
  insuranceFund: "0x132Ba3d3073FDa7440fb0594210C47eC19087eaD",

  cuOracle: "0x97f557594bA32e51c0eA215B1886111F24E957af",
  cuOracleAdapter: "0x102E0C04Aa75C0540e54687fC00598A25151e985",
  collateralOracle: "0x27F4970bd037c09440823755657c5fcF107532ae",
  oracle: "0x27F4970bd037c09440823755657c5fcF107532ae",
  multiAssetOracle: "0x97f557594bA32e51c0eA215B1886111F24E957af",

  mockUSDC: "0x947Cc17D8CbC0Fc1E64de138eE4947d3AF9C26EE",
  usdc: "0x947Cc17D8CbC0Fc1E64de138eE4947d3AF9C26EE",
  mockWETH: "0x0000000000000000000000000000000000000000",

  vammImpl: "0xC943C963DAFc8043E349a9191D4c567f2CB693AA",

  // Compatibility aliases used by older frontend modules.
  vammProxy: "0xd2F9b28ce16d0ed8Ff2cCCf638F0484b2f6508d4",
  vammProxyHyperscalers: "0x18c6103BDC17A8c7F1aE315Ccbdc9349205f248E",
  vammProxyNonHyperscalers: "0xDF3D211986E47946e079E85F24A2f22fd5C4C280",
  vammProxyB200: "0x0D8132954F4BefAE87a240AFE6584320bED12322",
  vammProxyAWSB200: "0x4ECd2da8789dd067833Acab3F4BF4857e8A0ca6B",
  vammProxyOracleB200: "0x0E9bF74e394219004CbD2b7d6Dd3443418d116E9",
  vammProxyCoreWeaveB200: "0x283Eb1C70c1ddFed588EFFF0B20A129Bd366CB96",
  vammProxyGCPB200: "0x4c77B2c6ab65f21108B5AB24A0d73e66E1C7BC0e",
  vammProxyH200: "0x564d5076B7229Fffa7Ca369C7752b2EC4376aBF6",
  vammProxyOracleH200: "0xa245588f6867F78866F38e947983Bdca6D12E937",
  vammProxyAWSH200: "0x3EC9bCC775dD69aA8b5D358c782f80a785B12d0e",
  vammProxyCoreWeaveH200: "0x69852D155Ddb624E9511382242cBfF1DC985bFef",
  vammProxyGCPH200: "0x6c35F2C88c99EcD7794cB4BcC1465C7129113a22",
  vammProxyAzureH200: "0x8a68985e036E7fD635eC8E8AFd8a86A61187D723",
  vammProxyAWSH100: "0x1a2150a6C3d4005b6515486CD5580D80D0a91df0",
  vammProxyAzureH100: "0x3F63a0f4B1E4DB3eff51d5a6495f6f5E9A5E4741",
  vammProxyGCPH100: "0x8a0b25E83F714E7d14AC8C7251673711ad0BE7e7",
  vammProxyA100: "0x9916716B80b353FdDEe6E5c480422d6BF73e3642",
  vammProxyT4: "0xA52c4170Da956Da2d270B4F52309657664e10819",
  vammProxyOld: "0x3e9Fb18d7C19Dfc25bC2d102be9453ee992D1993",

  h100OracleAdapter: "0x102E0C04Aa75C0540e54687fC00598A25151e985",
  hyperscalersOracleAdapter: "0x889F14bd4DCE05B9536Fd2F311c66E9EF87D5767",
  nonHyperscalersOracleAdapter: "0x2B274f3CdDFDe16f3BDAB9Fec61dfeCd9F0b256c",
  b200OracleAdapter: "0x80CfdA515047a94c4DbD7D5f42c17F395D817914",
  awsB200OracleAdapter: "0xDBA6Ce71E0d0cC7E9EE83B9cf57F173bF6a66e71",
  oracleB200OracleAdapter: "0x7F021ca464deE0446C18934639DA9cc98Baa3317",
  coreweaveB200OracleAdapter: "0xaD37F69ccB279A69E5037E5aF80B749b245e2780",
  gcpB200OracleAdapter: "0x02b9bbA6194b3eC79f7501fe8095A4f34BcA95c6",
  h200OracleAdapter: "0x086172Fe6a05328475D7E1250ee2Fdc25d7988b3",
  oracleH200OracleAdapter: "0x681C7239aEaE68CB004e31CF5f16B1775b11034d",
  awsH200OracleAdapter: "0x7182cd8Cb409d36371E70B221A1D865045A51dD5",
  coreweaveH200OracleAdapter: "0xC09e47700a690Bde5d0C8AdDfA76b5E0b665Ca80",
  gcpH200OracleAdapter: "0x6E41b38DBc1A2f9dA788e4E4B882658c6E42E7B5",
  azureH200OracleAdapter: "0x3086840bbe8Fd88B4B5896a78f7eb81CA8c3D11A",
  awsH100OracleAdapter: "0xDDF720ee44c4393DDaf8EC562C6F04A107d06465",
  azureH100OracleAdapter: "0xab88BcF511a7f67150C2E7d01CFb11Bf81253cce",
  gcpH100OracleAdapter: "0x7C8A291C365E131Ff6A715625c57d7bb9E8efA47",
  a100OracleAdapter: "0x7f12F480469213613cFBd8ec0977c4fC5F04ff9e",
  t4OracleAdapter: "0xf35ADbb38FbcAD8922121eED5203d7dA1242143D",
};

export const MARKET_IDS = {
  "A100-PERP": "0x7c611d543b87d4eecced3a16f8db373340d784390882ad3e2fd76f257a51cf55",
  "AWS-H100-PERP": "0x69df00e859e1b007896c59653bb3ca35622fdf2bf46c2fd9fea7ffa7d88b6378",
  "AWS-H200-PERP": "0x7e0ed16d08b6e36ae874386fd9c02a530e31026876a299a5ac59e9a8a7859c8e",
  "AZURE-H100-PERP": "0x2492e86fcfe9b174434dfca2c27205159a34cf4e90f0ec7a1605fae91a7e7bbd",
  "COREWEAVE-H200-PERP": "0x05b98a16e85afdd21369f8dde4ae197e2b445f37445b0e382ebcfdd10b711306",
  "GCP-H100-PERP": "0x8c78c8c17cc7712fe1b17592a2c0a7f814f8ec784de0fbb4ae6573e3457e11dd",
  "GCP-H200-PERP": "0xd0394d4ba76fe79cd0b954eb8e205df0cc4f08fb654dc916f5728d31c19f9305",
  "ORACLE-H200-PERP": "0x78b1dd5626222aef5d91e323da7cbe8941adb4eaaf0d1e90ac2dcee2680be01f",
  "T4-PERP": "0xb1bae2ea6c465ce4acb7d8a4a16a8899c9cc94ac35b5a82403875c6b2aa34f3e",
  "H100-GPU-PERP": "0xa583a10b2c0991c6f416501cbea19895d7becde9398eff1b7f60ef1120547d53",
  "H100-HyperScalers-PERP": "0xf4aa47cc83b0d01511ca8025a996421dda6fbab1764466da4b0de6408d3db2e2",
  "ORACLE-H200-PERPETUAL": "0x61f05fafb6842941c9a7d6839378de32d97a2de181b4db0e276b8d2093b61866",
  "AWS-H200-PERPETUAL": "0x12aa394c59dbf446e7ba1d3ab66f4629761c27d0dbacf484da0f4b205260c8fc",
  "COREWEAVE-H200-PERPETUAL": "0xf8444beb26f5f34e8d5ec6c988b1023100cd68287fa48066b54e428188ffa447",
  "GCP-H200-PERPETUAL": "0xb654d9eedc69b55e0fe883d03cae37d13fdacc319a5a1f507bb33875e0e14201",
  "AZURE-H200-PERPETUAL": "0xc845b4b5cdd753d1ad772bc105e5c4ddddff19c3da674c69da5c9f1a810bb872",
  "B200-PERP-V2": "0x02164b06b5fff171a87dbb519e6d639871a0cfbc0e44d411313256d0168b60fe",
  "AWS-B200-PERP": "0xb7269b1b771cba59419ca55da90b293f89e72d986f7f50cb542e22797ad46f14",
  "ORACLE-B200-PERP": "0x409078466c3ce47594bb7591497b09163aae7262d949015e19a7c4c947434d80",
  "COREWEAVE-B200-PERP": "0x75da99206b1151e67ba75b25d99b3e2609e1d80b86bb0339fe90a7c4e64930f0",
  "GCP-B200-PERP": "0xcf1ddf7c363a1165e075f2c8ddcb837d0a5417ee0c7209660c101c804fb1dd97",
  "H200-PERP-V2": "0x44830e9eceb656b494dfe3cff6e46a6774961143bd28655e8232777def9ba92c",
  "H100-non-HyperScalers-PERP-V2": "0x477dc2e232406bbfce22f7ed7abfde0177a869d41729ed1f3e169f1014716ce8",

  // Backward-compatible frontend aliases. These point at the non-broken live markets.
  "H100-PERP": "0xa583a10b2c0991c6f416501cbea19895d7becde9398eff1b7f60ef1120547d53",
  "B200-PERP": "0x02164b06b5fff171a87dbb519e6d639871a0cfbc0e44d411313256d0168b60fe",
  "H200-PERP": "0x44830e9eceb656b494dfe3cff6e46a6774961143bd28655e8232777def9ba92c",
  "H100-non-HyperScalers-PERP": "0x477dc2e232406bbfce22f7ed7abfde0177a869d41729ed1f3e169f1014716ce8",
  "AZURE-H200-PERP": "0xc845b4b5cdd753d1ad772bc105e5c4ddddff19c3da674c69da5c9f1a810bb872",
  "ETH-PERP-V2": "0xa583a10b2c0991c6f416501cbea19895d7becde9398eff1b7f60ef1120547d53",
  "ETH-PERP": "0xa583a10b2c0991c6f416501cbea19895d7becde9398eff1b7f60ef1120547d53",
};

const liveMarkets = [
  ["A100-PERP", "A100 GPU", "A100 GPU Hourly Rate Perpetual", "0x9916716B80b353FdDEe6E5c480422d6BF73e3642", "0x7f12F480469213613cFBd8ec0977c4fC5F04ff9e", "gpu"],
  ["AWS-H100-PERP", "AWS H100", "AWS H100 GPU Hourly Rate Perpetual", "0x1a2150a6C3d4005b6515486CD5580D80D0a91df0", "0xDDF720ee44c4393DDaf8EC562C6F04A107d06465", "hyperscaler"],
  ["AWS-H200-PERP", "AWS H200", "AWS H200 GPU Hourly Rate Perpetual", "0x3EC9bCC775dD69aA8b5D358c782f80a785B12d0e", "0x7182cd8Cb409d36371E70B221A1D865045A51dD5", "hyperscaler"],
  ["AZURE-H100-PERP", "Azure H100", "Azure H100 GPU Hourly Rate Perpetual", "0x3F63a0f4B1E4DB3eff51d5a6495f6f5E9A5E4741", "0xab88BcF511a7f67150C2E7d01CFb11Bf81253cce", "hyperscaler"],
  ["COREWEAVE-H200-PERP", "CoreWeave H200", "CoreWeave H200 GPU Hourly Rate Perpetual", "0x69852D155Ddb624E9511382242cBfF1DC985bFef", "0xC09e47700a690Bde5d0C8AdDfA76b5E0b665Ca80", "provider"],
  ["GCP-H100-PERP", "GCP H100", "Google Cloud H100 GPU Hourly Rate Perpetual", "0x8a0b25E83F714E7d14AC8C7251673711ad0BE7e7", "0x7C8A291C365E131Ff6A715625c57d7bb9E8efA47", "hyperscaler"],
  ["GCP-H200-PERP", "GCP H200", "Google Cloud H200 GPU Hourly Rate Perpetual", "0x6c35F2C88c99EcD7794cB4BcC1465C7129113a22", "0x6E41b38DBc1A2f9dA788e4E4B882658c6E42E7B5", "hyperscaler"],
  ["ORACLE-H200-PERP", "Oracle H200", "Oracle Cloud H200 GPU Hourly Rate Perpetual", "0xa245588f6867F78866F38e947983Bdca6D12E937", "0x681C7239aEaE68CB004e31CF5f16B1775b11034d", "provider"],
  ["T4-PERP", "T4 GPU", "T4 GPU Hourly Rate Perpetual", "0xA52c4170Da956Da2d270B4F52309657664e10819", "0xf35ADbb38FbcAD8922121eED5203d7dA1242143D", "gpu"],
  ["H100-GPU-PERP", "H100 GPU", "H100 GPU Hourly Rate Perpetual", "0xd2F9b28ce16d0ed8Ff2cCCf638F0484b2f6508d4", "0x102E0C04Aa75C0540e54687fC00598A25151e985", "gpu"],
  ["H100-HyperScalers-PERP", "H100 HyperScalers", "H100 HyperScalers GPU Hourly Rate Perpetual", "0x18c6103BDC17A8c7F1aE315Ccbdc9349205f248E", "0x889F14bd4DCE05B9536Fd2F311c66E9EF87D5767", "hyperscaler"],
  ["ORACLE-H200-PERPETUAL", "Oracle H200 Perpetual", "Oracle Cloud H200 GPU Hourly Rate Perpetual", "0xc4C187F1a499Bf1f565F9816bD0427F676B772c2", "0xdF09648b24E5D33DCa05666E0EAC5579Ce2cC21c", "provider"],
  ["AWS-H200-PERPETUAL", "AWS H200 Perpetual", "AWS H200 GPU Hourly Rate Perpetual", "0x079A30C8Aa3D34FcF17B9e288bd05C04Df203e23", "0xF037e07986aDC4485454E29Eb8f5587F0cc98f6A", "hyperscaler"],
  ["COREWEAVE-H200-PERPETUAL", "CoreWeave H200 Perpetual", "CoreWeave H200 GPU Hourly Rate Perpetual", "0x15df002e93168Cf574Bdad50D05AC2bAAaC6Cd6a", "0x58886052e3454675276B9c33794a386153879C0E", "provider"],
  ["GCP-H200-PERPETUAL", "GCP H200 Perpetual", "Google Cloud H200 GPU Hourly Rate Perpetual", "0x2395987E973CdFc4e145b1220D3ee34FC7c8E084", "0xE28B9824E26983dC5aCAbD8c47a535d5dE88E84C", "hyperscaler"],
  ["AZURE-H200-PERPETUAL", "Azure H200 Perpetual", "Azure H200 GPU Hourly Rate Perpetual", "0x8a68985e036E7fD635eC8E8AFd8a86A61187D723", "0x3086840bbe8Fd88B4B5896a78f7eb81CA8c3D11A", "hyperscaler"],
  ["B200-PERP-V2", "B200 GPU", "B200 GPU Hourly Rate Perpetual", "0x0D8132954F4BefAE87a240AFE6584320bED12322", "0x80CfdA515047a94c4DbD7D5f42c17F395D817914", "gpu"],
  ["AWS-B200-PERP", "AWS B200", "AWS B200 GPU Hourly Rate Perpetual", "0x4ECd2da8789dd067833Acab3F4BF4857e8A0ca6B", "0xDBA6Ce71E0d0cC7E9EE83B9cf57F173bF6a66e71", "hyperscaler"],
  ["ORACLE-B200-PERP", "Oracle B200", "Oracle Cloud B200 GPU Hourly Rate Perpetual", "0x0E9bF74e394219004CbD2b7d6Dd3443418d116E9", "0x7F021ca464deE0446C18934639DA9cc98Baa3317", "provider"],
  ["COREWEAVE-B200-PERP", "CoreWeave B200", "CoreWeave B200 GPU Hourly Rate Perpetual", "0x283Eb1C70c1ddFed588EFFF0B20A129Bd366CB96", "0xaD37F69ccB279A69E5037E5aF80B749b245e2780", "provider"],
  ["GCP-B200-PERP", "GCP B200", "Google Cloud B200 GPU Hourly Rate Perpetual", "0x4c77B2c6ab65f21108B5AB24A0d73e66E1C7BC0e", "0x02b9bbA6194b3eC79f7501fe8095A4f34BcA95c6", "hyperscaler"],
  ["H200-PERP-V2", "H200 GPU", "H200 GPU Hourly Rate Perpetual", "0x564d5076B7229Fffa7Ca369C7752b2EC4376aBF6", "0x086172Fe6a05328475D7E1250ee2Fdc25d7988b3", "gpu"],
  ["H100-non-HyperScalers-PERP-V2", "H100 Neocloud", "H100 non-HyperScalers GPU Hourly Rate Perpetual", "0xDF3D211986E47946e079E85F24A2f22fd5C4C280", "0x2B274f3CdDFDe16f3BDAB9Fec61dfeCd9F0b256c", "provider"],
];

export const MARKETS = Object.fromEntries(
  liveMarkets.map(([name, displayName, fullName, vamm, oracle, category]) => [
    name,
    {
      id: MARKET_IDS[name],
      name,
      displayName,
      fullName,
      baseAsset: "GPU-HOURS",
      quoteAsset: "USDC",
      vamm,
      oracle,
      vammAddress: vamm,
      oracleAddress: oracle,
      category,
      type: "Perpetual",
      feeBps: 10,
      active: true,
      status: "Active",
      description: `Trade ${fullName.replace(" Perpetual", "")}.`,
    },
  ])
);

const marketAliases = {
  "H100-PERP": "H100-GPU-PERP",
  "B200-PERP": "B200-PERP-V2",
  "H200-PERP": "H200-PERP-V2",
  "H100-non-HyperScalers-PERP": "H100-non-HyperScalers-PERP-V2",
  "AZURE-H200-PERP": "AZURE-H200-PERPETUAL",
  "ETH-PERP-V2": "H100-GPU-PERP",
  "ETH-PERP": "H100-GPU-PERP",
};

for (const [alias, target] of Object.entries(marketAliases)) {
  MARKETS[alias] = {
    ...MARKETS[target],
    name: alias,
    id: MARKET_IDS[alias],
    isAlias: true,
    aliasFor: target,
  };
}

export const DEFAULT_MARKET_KEY = "H100-GPU-PERP";
export const DEFAULT_MARKET_ID = MARKET_IDS[DEFAULT_MARKET_KEY];

export const IMPLEMENTATIONS = {
  clearingHouseProxy: SEPOLIA_CONTRACTS.clearingHouseProxy,
  clearingHouseImpl: SEPOLIA_CONTRACTS.clearingHouseImpl,
  clearingHouseLogic: SEPOLIA_CONTRACTS.clearingHouseLogic,
  vammImpl: SEPOLIA_CONTRACTS.vammImpl,
};

export const COLLATERAL_TOKENS = [
  {
    address: SEPOLIA_CONTRACTS.mockUSDC,
    symbol: "mUSDC",
    name: "Mock USDC",
    decimals: 6,
    icon: "$",
  },
];

export const CHAIN_CONFIG = {
  chainId: 11155111,
  name: "Sepolia",
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  blockExplorer: "https://sepolia.etherscan.io",
};

export const DEPLOYMENT_HISTORY = {
  "sepolia-redeploy-2026-05-08": {
    date: "2026-05-08",
    description: "Fresh Sepolia deployment wired from sepolia_updated_addresses.md",
    clearingHouseProxy: SEPOLIA_CONTRACTS.clearingHouseProxy,
    marketRegistry: SEPOLIA_CONTRACTS.marketRegistry,
    collateralVault: SEPOLIA_CONTRACTS.collateralVault,
    markets: liveMarkets.map(([name]) => name),
  },
};

export function getContractAddress(contractName) {
  return SEPOLIA_CONTRACTS[contractName];
}

export function isCorrectNetwork(chainId) {
  return chainId === CHAIN_CONFIG.chainId;
}

export function getEtherscanLink(address, type = "address") {
  return `${CHAIN_CONFIG.blockExplorer}/${type}/${address}`;
}

export function getTxLink(hash) {
  return getEtherscanLink(hash, "tx");
}

export function getMarketById(marketId) {
  return Object.values(MARKETS).find((market) => market.id === marketId);
}

export function getMarketByName(marketName) {
  return MARKETS[marketName] || MARKETS[marketAliases[marketName]];
}

export function getActiveMarkets() {
  return Object.values(MARKETS).filter((market) => market.active && !market.isAlias);
}
