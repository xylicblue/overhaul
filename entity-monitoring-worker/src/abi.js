import { parseAbi, parseAbiItem } from 'viem';

export const clearingHouseReadAbi = parseAbi([
  'function getAccountValue(address account) view returns (int256)',
  'function getPosition(address account, bytes32 marketId) view returns ((int256 size, uint256 margin, uint256 entryPriceX18, uint256 lastFundingPayIndex, uint256 lastFundingReceiveIndex, int256 realizedPnL))',
  'function getNotional(address account, bytes32 marketId) view returns (uint256)',
  'function getMarginRatio(address account, bytes32 marketId) view returns (uint256)',
]);

export const tradeExecutedEvent = parseAbiItem(
  'event TradeExecuted(address indexed user, bytes32 indexed marketId, int256 baseDelta, int256 quoteDelta, uint256 executionPrice, int256 newSize, uint256 newMargin, int256 realizedPnL, uint256 fee)',
);

export const collateralDepositedEvent = parseAbiItem(
  'event collateralDeposited(address indexed user, address indexed token, uint256 amount)',
);

export const collateralWithdrawnEvent = parseAbiItem(
  'event collateralWithdrawn(address indexed user, address indexed token, uint256 amount)',
);
