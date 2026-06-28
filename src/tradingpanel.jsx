import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTradingStore } from "./stores/useTradingStore";
import ReactDOM from "react-dom";
import { toast } from "react-hot-toast";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { parseUnits } from "ethers";
import { recordTradeWithRetry } from "./services/tradeQueue";
import { useMarketRealTimeData } from "./marketData";
import {
  useOpenPosition,
  useAddMargin,
  useAllPositions,
  usePosition,
  useMarketRiskParams,
  useReservedMarginForQuoteToken,
} from "./hooks/useClearingHouse";
import { useVAMMReserves } from "./hooks/useVAMM";
import { MARKET_IDS, SEPOLIA_CONTRACTS } from "./contracts/addresses";
import MarketRegistryABI from "./contracts/abis/MarketRegistry.json";
import CollateralVaultABI from "./contracts/abis/CollateralVault.json";
import ClearingHouseABI from "./contracts/abis/ClearingHouse.json";
import { Info, ShieldCheck, ChevronDown } from "lucide-react";
import { getSepoliaTxUrl } from "./utils/transactionErrors";
import { diagnoseOpenPositionError, diagnoseFundingBlocker } from "./utils/tradeFailureDiagnosis";
import { waitForPositionMargin } from "./utils/positionRefresh";
import {
  ZERO_PREVIEW,
  buildOpenOrderPreview,
  calculateLeverageX18,
  findBaseSizeForNotional,
  findMaxOpenSize,
  formatX18Number,
  MARGIN_TOP_UP_DUST_X18,
  toNumberX18,
} from "./utils/orderPreview";
import FirstTradeConsentModal from "./components/FirstTradeConsentModal";
import { hasAcceptedTradingConsent, acceptTradingConsent } from "./services/privacyAck";

const DEFAULT_FEE_BPS = 10;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const WAD = 10n ** 18n;
const MIN_TARGET_LEVERAGE = 1;
const MAX_TARGET_LEVERAGE_CAP = 10;

const PRICE_READ_ABI = [{
  type: "function",
  name: "getPrice",
  inputs: [],
  outputs: [{ type: "uint256" }],
  stateMutability: "view",
}];
const MARK_READ_ABI = [{
  type: "function",
  name: "getMarkPrice",
  inputs: [],
  outputs: [{ type: "uint256" }],
  stateMutability: "view",
}];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value) => {
  if (typeof value === "string") {
    const normalized = value.replace(/[$,\s]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseX18Input = (value) => {
  try {
    if (value === undefined || value === null || value === "") return 0n;
    return parseUnits(value.toString(), 18);
  } catch {
    return 0n;
  }
};

const formatX18Input = (value) => {
  if (!value || value <= 0n) return "";
  const whole = value / WAD;
  const fraction = value % WAD;
  if (fraction === 0n) return whole.toString();
  const fractionText = fraction.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${fractionText}`;
};

const formatUsd = (value, digits = 2) => `$${formatX18Number(value, digits)}`;

const valueAt = (result, key, index) => result?.[key] ?? result?.[index];

const normalizePositionResult = (result) => ({
  size: valueAt(result, "size", 0) || 0n,
  margin: valueAt(result, "margin", 1) || 0n,
  entryPrice: valueAt(result, "entryPriceX18", 2) || 0n,
});

// ─────────────────────────────────────────────────────────────────────────────
// Info Tooltip
// ─────────────────────────────────────────────────────────────────────────────
const InfoTooltip = ({ title, description }) => {
  const [pos, setPos]         = React.useState({ top: 0, left: 0 });
  const [hovered, setHovered] = React.useState(false);
  const ref                   = React.useRef(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.right - 220 });
      setHovered(true);
    }
  };

  return (
    <>
      <span
        ref={ref}
        className="inline-flex text-ink-ghost hover:text-ink-faint cursor-help transition-colors"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
      >
        <Info size={11} />
      </span>
      {hovered && ReactDOM.createPortal(
        <div
          className="fixed z-[200] w-56 p-3 bg-surface-2 border border-line rounded-xl shadow-2xl text-xs pointer-events-none"
          style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
        >
          <div className="font-semibold text-ink mb-1">{title}</div>
          <div className="text-ink-muted leading-relaxed">{description}</div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SummaryRow — single label/value line used in order summary & risk params
// ─────────────────────────────────────────────────────────────────────────────
const SummaryRow = ({ label, value, valueClass = "text-ink-muted", tooltip }) => (
  <div className="flex items-center justify-between text-[11px] leading-5">
    <span className="text-ink-faint flex items-center gap-1">
      {label}
      {tooltip && <InfoTooltip title={tooltip.title} description={tooltip.desc} />}
    </span>
    <span className={`num ${valueClass}`}>{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PanelSlider — sample-style range slider (green gradient fill, ruler ticks, vertical-bar handle)
// ─────────────────────────────────────────────────────────────────────────────
const PanelSlider = ({ value, min = 0, max, step, onChange, disabled = false, down = false }) => {
  const range = max - min;
  const pct = range > 0 ? Math.min(100, Math.max(0, ((value - min) / range) * 100)) : 0;
  const active = !disabled && max > min;
  return (
    <div className="flex-1 relative h-6 flex items-center">
      <div className="relative w-full h-1.5 bg-surface-3 rounded-full">
        {/* gradient fill */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${down ? "bg-gradient-to-r from-down-solid to-down" : "bg-gradient-to-r from-up-solid to-up"}`}
          style={{ width: `${pct}%` }}
        />
        {/* ruler ticks every 5% — only on the unfilled track so the fill stays clean */}
        {Array.from({ length: 21 }).map((_, i) => {
          const tickPct = i * 5;
          if (tickPct <= pct + 0.01) return null;
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-px h-2 bg-line pointer-events-none"
              style={{ left: `${tickPct}%` }}
            />
          );
        })}
        {/* vertical-bar handle */}
        {active && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-4 rounded-full pointer-events-none z-10 ${down ? "bg-down" : "bg-up"}`}
            style={{
              left: `calc(${pct}% - 3px)`,
              boxShadow: down ? "0 0 8px rgba(245,72,78,0.55)" : "0 0 8px rgba(41,210,139,0.55)",
            }}
          />
        )}
        {/* native range input — full-area, transparent, drives the value */}
        <input
          type="range"
          min={min}
          max={max > min ? max : min + 1}
          step={step}
          value={value || 0}
          onChange={onChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TradingPanel
// ─────────────────────────────────────────────────────────────────────────────
export const TradingPanel = ({ selectedMarket }) => {
  const { side, size, priceLimit, lastTxHash,
          setSide, setSize, setPriceLimit,
          resetOrder, setLastTx } = useTradingStore();
  const { address }               = useAccount();
  const publicClient              = usePublicClient({ chainId: 11155111 });

  const marketId                 = selectedMarket?.marketId || selectedMarket?.id || MARKET_IDS[selectedMarket?.name] || MARKET_IDS["H100-PERP"];
  const { riskParams }           = useMarketRiskParams(marketId);
  const leverageEnabled          = Number(riskParams?.imrBps || 0) > 0;
  const { data: marketConfig }   = useReadContract({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: [marketId],
    chainId: 11155111,
    query: {
      enabled: !!marketId,
      refetchInterval: 30000,
    },
  });

  const {
    openPosition,
    simulateOpenPosition,
    isConfirming,
    isSuccess,
    error: tradeError,
    receiptError,
    hash,
    reset: resetTrade,
  } = useOpenPosition(marketId);
  const {
    addMarginRaw,
    simulateAddMarginRaw,
    reset: resetAddMargin,
  } = useAddMargin(marketId);

  const { positions: allPositions, refetch: refetchAllPositions } = useAllPositions();
  const [preflightError, setPreflightError] = useState(null);
  const [isSimulating,   setIsSimulating]   = useState(false);
  const [isOrderExecuting, setIsOrderExecuting] = useState(false);
  const [orderInputMode, setOrderInputMode] = useState("base");
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [targetLeverage, setTargetLeverage] = useState(MIN_TARGET_LEVERAGE);
  const [lastAchievedLeverage, setLastAchievedLeverage] = useState(null);

  // ── First-ever-trade consent gate (Risk Disclosure + Privacy Policy) ───────
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const consentAcceptedRef = useRef(false); // synchronous source of truth for the gate

  useEffect(() => {
    let cancelled = false;
    hasAcceptedTradingConsent().then((accepted) => {
      if (!cancelled) consentAcceptedRef.current = accepted;
    });
    return () => { cancelled = true; };
  }, [address]);

  const marketName = typeof selectedMarket === "string" ? selectedMarket : selectedMarket?.name;
  const { data: market, isLoading, error } = useMarketRealTimeData(marketName);
  const { position, refetch: refetchPosition } = usePosition(marketId, address);
  const vammAddress = selectedMarket?.vammAddress || selectedMarket?.vamm || market?.vammAddress;
  const reserves = useVAMMReserves(vammAddress);
  const quoteToken = valueAt(marketConfig, "quoteToken", 7) || SEPOLIA_CONTRACTS.mockUSDC;
  const quoteTokenEnabled = !!address && !!quoteToken && quoteToken !== ZERO_ADDRESS;
  const { reservedMarginRaw } = useReservedMarginForQuoteToken(quoteToken, address);
  const { data: quoteBalanceRaw } = useReadContract({
    address: SEPOLIA_CONTRACTS.collateralVault,
    abi: CollateralVaultABI.abi,
    functionName: "balanceOf",
    args: [address, quoteToken],
    chainId: 11155111,
    query: {
      enabled: quoteTokenEnabled,
      refetchInterval: 5000,
    },
  });
  const { data: quoteValueRaw } = useReadContract({
    address: SEPOLIA_CONTRACTS.collateralVault,
    abi: CollateralVaultABI.abi,
    functionName: "getTokenValueX18",
    args: [quoteToken, quoteBalanceRaw || 0n],
    chainId: 11155111,
    query: {
      enabled: quoteTokenEnabled && quoteBalanceRaw !== undefined,
      refetchInterval: 5000,
    },
  });

  const isLong = side === "Buy";
  const submittedOpenOrderRef = useRef(null);
  const lastTargetLeverageMarketRef = useRef(null);
  const maxSelectableLeverage = useMemo(() => {
    const imrBps = Number(riskParams?.imrBps || 0);
    if (imrBps <= 0) return MIN_TARGET_LEVERAGE;
    return clamp(Math.floor(10000 / imrBps), MIN_TARGET_LEVERAGE, MAX_TARGET_LEVERAGE_CAP);
  }, [riskParams?.imrBps]);
  const selectedTargetLeverage = leverageEnabled
    ? clamp(targetLeverage, MIN_TARGET_LEVERAGE, maxSelectableLeverage)
    : targetLeverage;

  useEffect(() => {
    if (!leverageEnabled) {
      lastTargetLeverageMarketRef.current = null;
      return;
    }

    const marketChanged = lastTargetLeverageMarketRef.current !== marketId;
    lastTargetLeverageMarketRef.current = marketId;

    setTargetLeverage((current) => {
      if (marketChanged) return maxSelectableLeverage;
      return clamp(current || maxSelectableLeverage, MIN_TARGET_LEVERAGE, maxSelectableLeverage);
    });
  }, [leverageEnabled, marketId, maxSelectableLeverage]);

  useEffect(() => setLastAchievedLeverage(null), [marketId, address]);

  // ── Calculations (memoised — only rerun when inputs actually change) ───────
  const {
    effectiveBalance, marketPrice, executionPrice,
    maxSize, maxNotional, sizeNum, inputNum, sliderMax, sliderValue,
    riskPrice, marginPriceSource, feeBps, liqPrice, isOverMax, invalidReason,
    preview, amountLimit, protocolSize, targetMarginRaw, extraMarginRaw,
  } = useMemo(() => {
    const quoteFreeCollateralRaw = quoteValueRaw && quoteValueRaw > reservedMarginRaw
      ? quoteValueRaw - reservedMarginRaw
      : 0n;
    const effectiveBalance = toNumberX18(quoteFreeCollateralRaw);
    const currentPrice  = toNumber(market?.markPriceRaw);
    const indexPrice    = toNumber(market?.oraclePriceRaw);
    const marketPrice   = currentPrice || indexPrice || toNumber(market?.price);
    const inputX18 = parseX18Input(size);
    const limitPriceX18 = parseX18Input(priceLimit);
    const targetLeverageRaw = leverageEnabled ? parseX18Input(selectedTargetLeverage.toString()) : 0n;
    const feeBps        = Number(valueAt(marketConfig, "feeBps", 1) ?? reserves.feeBps ?? selectedMarket?.feeBps ?? market?.feeBps ?? DEFAULT_FEE_BPS);
    const previewParams = {
      isLong,
      sizeX18: 0n,
      limitPriceX18,
      reserveBase: reserves.baseReserveRaw || 0n,
      reserveQuote: reserves.quoteReserveRaw || 0n,
      minReserveBase: reserves.minReserveBaseRaw || 0n,
      minReserveQuote: reserves.minReserveQuoteRaw || 0n,
      feeBps: BigInt(feeBps || 0),
      imrBps: BigInt(riskParams?.imrBps || 0),
      mmrBps: BigInt(riskParams?.mmrBps || 0),
      oraclePrice: market?.oraclePriceRaw ? parseX18Input(market.oraclePriceRaw) : 0n,
      quoteFreeCollateral: quoteFreeCollateralRaw,
      minPositionSize: riskParams?.minPositionSizeRaw || 0n,
      maxPositionSize: riskParams?.maxPositionSizeRaw || 0n,
      existingSizeX18: position?.sizeRaw || 0n,
      existingMarginX18: position?.marginRaw || 0n,
      existingEntryPriceX18: parseX18Input(position?.entryPriceX18 || "0"),
      targetLeverageX18: targetLeverageRaw,
    };
    const maxSizeRaw = findMaxOpenSize(previewParams);
    const notionalConversion = orderInputMode === "notional"
      ? findBaseSizeForNotional(previewParams, inputX18)
      : null;
    const sizeX18 = orderInputMode === "notional" ? notionalConversion.sizeX18 : inputX18;
    const protocolSize = formatX18Input(sizeX18);
    let preview = buildOpenOrderPreview({ ...previewParams, sizeX18 });
    if (orderInputMode === "notional" && inputX18 > 0n && notionalConversion && !notionalConversion.ok) {
      preview = {
        ...preview,
        ok: false,
        reason: notionalConversion.reason || preview.reason || "Notional is not executable",
      };
    }
    const maxPreview = maxSizeRaw > 0n
      ? buildOpenOrderPreview({ ...previewParams, sizeX18: maxSizeRaw, limitPriceX18: 0n })
      : ZERO_PREVIEW;
    const maxNotionalRaw = maxPreview.ok ? maxPreview.notional : 0n;
    const inputNum = toNumber(size);
    const sizeNum = toNumberX18(sizeX18);
    const maxSize = toNumberX18(maxSizeRaw);
    const maxNotional = toNumberX18(maxNotionalRaw);
    const targetMarginRaw = preview.targetMargin;
    const extraMarginRaw = preview.extraMargin;
    const currentMarkRaw = parseX18Input(market?.markPriceRaw || market?.price || "0");
    const marginMarkRaw = preview.postTradeMark > 0n ? preview.postTradeMark : currentMarkRaw;
    const indexPriceRaw = previewParams.oraclePrice;
    const riskPriceRaw = marginMarkRaw > indexPriceRaw ? marginMarkRaw : indexPriceRaw;
    const marginPriceSource = marginMarkRaw === indexPriceRaw
      ? "Mark / Index"
      : marginMarkRaw > indexPriceRaw
        ? (sizeX18 > 0n ? "Post-trade mark" : "Mark")
        : "Index";

    return {
      effectiveBalance,
      marketPrice,
      executionPrice: toNumberX18(preview.avgPrice),
      maxSize,
      maxNotional,
      sizeNum,
      inputNum,
      sliderMax: orderInputMode === "notional" ? maxNotional : maxSize,
      sliderValue: orderInputMode === "notional" ? inputNum : sizeNum,
      fees: toNumberX18(preview.fee),
      marginRequired: toNumberX18(preview.finalMargin),
      collateralRequired: toNumberX18(preview.totalRequired),
      riskPrice: toNumberX18(riskPriceRaw),
      marginPriceSource,
      feeBps,
      liqPrice: preview.liqPrice > 0n ? formatX18Number(preview.liqPrice, 2) : "—",
      isOverMax: inputX18 > 0n && !preview.ok,
      invalidReason: inputX18 > 0n ? preview.reason : null,
      preview,
      amountLimit: preview.amountLimit,
      protocolSize,
      targetMarginRaw,
      extraMarginRaw,
    };
  }, [
    quoteValueRaw, reservedMarginRaw, market?.markPriceRaw, market?.price, market?.oraclePriceRaw,
    market?.feeBps, priceLimit, riskParams, marketConfig, reserves.baseReserveRaw,
    reserves.quoteReserveRaw, reserves.minReserveBaseRaw, reserves.minReserveQuoteRaw,
    reserves.feeBps, selectedMarket?.feeBps, size, isLong, position?.sizeRaw,
    position?.marginRaw, position?.entryPriceX18, orderInputMode, leverageEnabled, selectedTargetLeverage,
  ]);

  const saveSubmittedTrade = useCallback(async (submittedOrder, txHash) => {
    if (!address || !submittedOrder) return;
    await recordTradeWithRetry(
      {
        userAddress: address,
        market: submittedOrder.marketDisplayName,
        side: submittedOrder.sideLabel,
        size: submittedOrder.sizeNum,
        price: submittedOrder.marketPrice,
        notional: submittedOrder.notional,
        txHash,
      },
      {
        market: submittedOrder.marketKey,
        price: submittedOrder.markRaw || submittedOrder.marketPrice,
        twap: submittedOrder.twapRaw || submittedOrder.markRaw || 0,
        timestamp: new Date().toISOString(),
      }
    );
  }, [address]);

  const readLeverageSnapshot = useCallback(async () => {
    if (!publicClient || !address || !marketId) throw new Error("Position state is unavailable");
    const freshMarket = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.marketRegistry,
      abi: MarketRegistryABI.abi,
      functionName: "getMarket",
      args: [marketId],
    });
    const vamm = valueAt(freshMarket, "vamm", 0);
    const oracle = valueAt(freshMarket, "oracle", 3);
    if (!vamm || !oracle || vamm === ZERO_ADDRESS || oracle === ZERO_ADDRESS) {
      throw new Error("Market pricing is unavailable");
    }

    const [positionResult, markPrice, indexPrice] = await Promise.all([
      publicClient.readContract({
        address: SEPOLIA_CONTRACTS.clearingHouse,
        abi: ClearingHouseABI.abi,
        functionName: "getPosition",
        args: [address, marketId],
      }),
      publicClient.readContract({ address: vamm, abi: MARK_READ_ABI, functionName: "getMarkPrice" }),
      publicClient.readContract({ address: oracle, abi: PRICE_READ_ABI, functionName: "getPrice" }),
    ]);
    const freshPosition = normalizePositionResult(positionResult);
    const riskPrice = markPrice > indexPrice ? markPrice : indexPrice;
    return { position: freshPosition, riskPrice };
  }, [publicClient, address, marketId]);

  const refreshConfirmedPosition = useCallback(async (minimumMarginRaw = 0n) => {
    const { snapshot } = await waitForPositionMargin({
      readSnapshot: readLeverageSnapshot,
      minimumMarginRaw,
    });
    await Promise.allSettled([
      refetchPosition?.(),
      refetchAllPositions?.(),
    ]);
    return snapshot;
  }, [readLeverageSnapshot, refetchPosition, refetchAllPositions]);

  // ── Trade success ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (hash && isConfirming && hash !== lastTxHash) {
      toast.loading(
        <div>
          <div>Submitted, waiting for confirmation...</div>
          <a href={getSepoliaTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan
          </a>
        </div>,
        { id: "trade" }
      );
    }
  }, [hash, isConfirming, lastTxHash]);

  useEffect(() => {
    if (isSuccess && hash && hash !== lastTxHash) {
      const submittedOrder = submittedOpenOrderRef.current;
      if (submittedOrder?.deferOpenSuccess) return;
      const openedSideLabel = submittedOrder?.sideLabel || "Position";
      setLastTx(hash, submittedOrder?.txActionText || openedSideLabel);
      toast.success(
        <div>
          <div>{openedSideLabel} opened.</div>
          <a href={getSepoliaTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan
          </a>
        </div>,
        { id: "trade", duration: 5000 }
      );
      saveSubmittedTrade(submittedOrder, hash);
      resetOrder();
      setTimeout(() => resetTrade(), 100);
    }
  }, [isSuccess, hash, lastTxHash, resetTrade, setLastTx, resetOrder, saveSubmittedTrade]);

  // ── Clear preflight error when the user changes inputs ───────────────────
  useEffect(() => { setPreflightError(null); }, [size, side, priceLimit, orderInputMode, targetLeverage]);

  // ── Trade error (post-wallet fallback) ────────────────────────────────────
  useEffect(() => {
    const failure = tradeError || receiptError;
    if (failure) {
      const diag = diagnoseOpenPositionError(failure, { marketName: market?.displayName || market?.name });
      setPreflightError(diag);
      toast.error(diag.message, { id: "trade" });
      resetTrade();
    }
  }, [tradeError, receiptError, resetTrade, market?.displayName, market?.name]);

  const currentPositionLeverage = useMemo(() => {
    if (!position?.hasPosition || !position?.marginRaw) return 0;
    const mark = parseX18Input(market?.markPriceRaw || "0");
    const index = parseX18Input(market?.oraclePriceRaw || "0");
    const riskPriceRaw = mark > index ? mark : index;
    return toNumberX18(calculateLeverageX18({
      sizeX18: position.sizeRaw,
      marginX18: position.marginRaw,
      riskPriceX18: riskPriceRaw,
    }));
  }, [position?.hasPosition, position?.sizeRaw, position?.marginRaw, market?.markPriceRaw, market?.oraclePriceRaw]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!selectedMarket) return <div className="flex items-center justify-center h-full text-ink-faint text-xs">Select a market</div>;
  if (isLoading)        return <div className="flex items-center justify-center h-full text-ink-faint text-xs">Loading…</div>;
  if (error || !market) return <div className="flex items-center justify-center h-full text-red-500 text-xs">Error loading market</div>;

  const isTradeBusy = isOrderExecuting;

  const handleTrade = async () => {
    setPreflightError(null);

    // ── 1. Local preview check ──────────────────────────────────────────────
    if (!size || inputNum <= 0 || !protocolSize) {
      return toast.error(orderInputMode === "notional" ? "Please enter a valid notional" : "Please enter a valid size");
    }
    if (!preview.ok) {
      const diag = { severity: "error", title: "Order Invalid", message: invalidReason || "Order is not executable." };
      setPreflightError(diag);
      return toast.error(diag.message, { id: "trade" });
    }
    // ── 2. Funding / liquidation scan across active positions ───────────────
    const blocker = diagnoseFundingBlocker(allPositions || []);
    if (blocker) {
      setPreflightError(blocker);
      toast.error(blocker.message, { id: "trade" });
      return;
    }

    // ── 2.5 First-ever-trade consent (Risk Disclosure + Privacy Policy) ──────
    // Order is valid — before processing the user's first trade, require them to
    // read and accept both documents. handleTrade is re-invoked from the modal's
    // confirm handler once the ref is set, so it falls through here.
    if (!consentAcceptedRef.current) {
      setShowConsentModal(true);
      return;
    }

    // ── 3. Simulate via eth_call before opening wallet ──────────────────────
    setIsSimulating(true);
    try {
      await simulateOpenPosition(isLong, protocolSize, amountLimit);
      if (extraMarginRaw > MARGIN_TOP_UP_DUST_X18) {
        await simulateAddMarginRaw(extraMarginRaw);
      }
    } catch (simErr) {
      const diag = diagnoseOpenPositionError(simErr, { marketName: market.displayName || market.name });
      setPreflightError(diag);
      toast.error(diag.message, { id: "trade" });
      setIsSimulating(false);
      return;
    }
    setIsSimulating(false);

    // ── 4. Simulation passed — open wallet ──────────────────────────────────
    let openSubmittedHash = null;
    let marginSubmittedHash = null;
    let marginSubmissionError = null;
    let openConfirmed = false;
    setIsOrderExecuting(true);
    try {
      submittedOpenOrderRef.current = {
        sideLabel: isLong ? "Long" : "Short",
        isLong,
        sizeNum,
        inputMode: orderInputMode,
        requestedInput: inputNum,
        marketDisplayName: market.displayName || market.name,
        marketName: market.name,
        marketKey: market.name,
        marketPrice: executionPrice || marketPrice,
        markRaw: parseFloat(market.markPriceRaw) || marketPrice,
        twapRaw: parseFloat(market.twapRaw) || parseFloat(market.markPriceRaw) || 0,
        notional: toNumberX18(preview.notional),
        txActionText: side,
        deferOpenSuccess: true,
      };
      toast.loading("Review order transaction in wallet...", { id: "trade" });
      openSubmittedHash = await openPosition(isLong, protocolSize, amountLimit);

      if (!openSubmittedHash || !publicClient) {
        throw new Error("Position submitted, but the app could not confirm the transaction.");
      }

      // Request the margin transaction immediately after the open transaction.
      // Waiting for the first receipt before requesting the second transaction
      // causes some wallets to suppress the delayed prompt. Wallet nonces keep
      // these transactions ordered on-chain.
      if (extraMarginRaw > MARGIN_TOP_UP_DUST_X18) {
        toast.loading("Review margin transaction in wallet...", { id: "trade" });
        try {
          marginSubmittedHash = await addMarginRaw(extraMarginRaw);
        } catch (marginError) {
          marginSubmissionError = marginError;
        }
      }

      toast.loading("Submitted, waiting for confirmation...", { id: "trade" });
      const openReceipt = await publicClient.waitForTransactionReceipt({ hash: openSubmittedHash });
      if (openReceipt?.status === "reverted") {
        throw new Error("Position transaction reverted.");
      }
      openConfirmed = true;

      if (marginSubmissionError) throw marginSubmissionError;
      if (marginSubmittedHash) {
        toast.loading("Applying target leverage...", { id: "trade" });
        const marginReceipt = await publicClient.waitForTransactionReceipt({ hash: marginSubmittedHash });
        if (marginReceipt?.status === "reverted") throw new Error("Margin adjustment reverted");
      }

      void saveSubmittedTrade(submittedOpenOrderRef.current, openSubmittedHash).catch(() => {
        // Trade indexing is non-critical and must not interrupt order completion.
      });
      try {
        const snapshot = await refreshConfirmedPosition(preview.finalMargin || targetMarginRaw || 0n);
        const achievedLeverage = toNumberX18(calculateLeverageX18({
          sizeX18: snapshot.position.size,
          marginX18: snapshot.position.margin,
          riskPriceX18: snapshot.riskPrice,
        }));
        setLastAchievedLeverage(achievedLeverage || null);
      } catch {
        // Both transactions are confirmed. Background polling remains active if
        // an RPC node has not exposed the updated position state yet.
        void Promise.allSettled([refetchPosition?.(), refetchAllPositions?.()]);
      }

      setLastTx(openSubmittedHash, submittedOpenOrderRef.current?.txActionText || side);
      toast.success(
        <div>
          <div>
            {submittedOpenOrderRef.current?.sideLabel || "Position"} opened
            {leverageEnabled ? ` at ${selectedTargetLeverage}×.` : "."}
          </div>
          <a href={getSepoliaTxUrl(openSubmittedHash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan
          </a>
        </div>,
        { id: "trade", duration: 5000 }
      );
      resetOrder();
      setTimeout(() => {
        resetTrade();
        resetAddMargin();
        submittedOpenOrderRef.current = null;
      }, 100);
    } catch (err) {
      if (openSubmittedHash && openConfirmed) {
        setLastTx(openSubmittedHash, submittedOpenOrderRef.current?.txActionText || side);
        toast.error("Margin transaction was not completed.", { id: "trade" });
      } else {
        const diag = diagnoseOpenPositionError(err, { marketName: market.name });
        setPreflightError(diag);
        toast.error(diag.message, { id: "trade" });
      }
    } finally {
      setIsOrderExecuting(false);
    }
  };

  // Both disclosures accepted — record acceptance, then resume the trade.
  const handleConsentConfirm = async () => {
    setConsentSubmitting(true);
    try {
      await acceptTradingConsent();
      consentAcceptedRef.current = true;
    } finally {
      setConsentSubmitting(false);
    }
    setShowConsentModal(false);
    handleTrade();
  };

  return (
    <div className="flex flex-col h-full bg-surface-1">
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 px-4 pt-3 pb-3 space-y-3">

        {/* ── Leverage slider + market-specific margin basis ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-ink-faint uppercase tracking-wide">Leverage</span>
            <span className={`text-[15px] font-bold num ${isLong ? "text-up" : "text-down"}`}>
              {leverageEnabled ? `${selectedTargetLeverage}×` : "Unavailable"}
            </span>
          </div>
          {leverageEnabled && (
            <PanelSlider
              value={selectedTargetLeverage}
              min={MIN_TARGET_LEVERAGE}
              max={maxSelectableLeverage}
              step={1}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(next)) setTargetLeverage(next);
              }}
              down={!isLong}
            />
          )}
          <div className="text-[10px] text-ink-faint">
            Margin allocation uses {marginPriceSource} price{riskPrice > 0 ? ` ($${riskPrice.toFixed(2)})` : ""}.
          </div>
        </div>

        {/* ── Order type ── */}
        <div className="flex items-center gap-6 border-b border-line-subtle">
          <span className="relative pb-2.5 text-[14px] font-semibold text-white cursor-default">
            Market
            <span className="absolute left-0 -bottom-px h-[2px] w-full bg-blue-500 rounded-full" />
          </span>
        </div>

        {/* ── Buy / Sell ── */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("Buy")}
            className={`h-10 rounded-lg text-[14px] font-semibold transition-colors duration-100 ${
              isLong
                ? "bg-up-solid text-white"
                : "bg-surface-2 border border-line text-ink-muted hover:text-ink"
            }`}
          >
            Buy / Long
          </button>
          <button
            onClick={() => setSide("Sell")}
            className={`h-10 rounded-lg text-[14px] font-semibold transition-colors duration-100 ${
              !isLong
                ? "bg-down-solid text-white"
                : "bg-surface-2 border border-line text-ink-muted hover:text-ink"
            }`}
          >
            Sell / Short
          </button>
        </div>

        {/* ── Available / Position ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-faint">Available to Trade:</span>
            <span className="num font-semibold text-white">${effectiveBalance.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-faint">Position:</span>
            <span className={`num font-semibold ${
              position?.hasPosition && toNumber(position?.size) !== 0
                ? (toNumber(position?.size) > 0 ? "text-up" : "text-down")
                : "text-ink-muted"
            }`}>
              {position?.hasPosition && toNumber(position?.size) !== 0
                ? `${toNumber(position?.size) > 0 ? "+" : ""}${toNumber(position?.size).toFixed(4)} ${market.baseAsset}`
                : "—"}
            </span>
          </div>
        </div>

        {/* ── Amount (with unit dropdown — GPU base ⇄ USDC notional) ── */}
        <div>
          <div className="flex items-center gap-2 h-11 rounded-lg border border-line bg-surface-2 px-3 focus-within:border-line-strong transition-colors">
            <span className="text-[13px] text-ink-faint shrink-0">Amount</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              className="flex-1 min-w-0 bg-transparent text-right text-[16px] text-white focus:outline-none placeholder-ink-ghost num"
              value={size}
              onChange={e => {
                // Digits + a single decimal point only. Using type=text (not number)
                // keeps the right-aligned fill and backspacing smooth across browsers.
                let v = e.target.value.replace(/[^0-9.]/g, "");
                const dot = v.indexOf(".");
                if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
                setSize(v);
              }}
            />
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setUnitMenuOpen(o => !o)}
                className="flex items-center gap-1 text-[13px] font-medium text-ink hover:text-white transition-colors"
              >
                {orderInputMode === "notional" ? "USDC" : market.baseAsset}
                <ChevronDown size={14} className="text-ink-faint" />
              </button>
              {unitMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-hidden="true"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setUnitMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-36 rounded-md border border-line bg-surface-2 shadow-xl overflow-hidden">
                    {[
                      { key: "base", label: market.baseAsset },
                      { key: "notional", label: "USDC" },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          if (orderInputMode !== opt.key) {
                            setOrderInputMode(opt.key);
                            setSize("");
                          }
                          setUnitMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                          orderInputMode === opt.key
                            ? "bg-surface-3 text-ink"
                            : "text-ink-muted hover:bg-surface-3 hover:text-ink"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Derived size (notional mode) + Max */}
          <div className="flex items-center justify-between mt-1.5 text-[11px] leading-4">
            <span className="text-ink-faint">
              {orderInputMode === "notional"
                ? (sizeNum > 0 ? `≈ ${sizeNum.toFixed(4)} ${market.baseAsset}` : " ")
                : " "}
            </span>
            <button
              type="button"
              onClick={() => {
                const m = orderInputMode === "notional" ? maxNotional : maxSize;
                setSize(m > 0 ? m.toFixed(4) : "");
              }}
              className="text-ink-faint hover:text-ink font-mono tabular-nums transition-colors"
            >
              Max {orderInputMode === "notional"
                ? `$${maxNotional > 0 ? maxNotional.toFixed(2) : "0.00"}`
                : `${maxSize > 0 ? maxSize.toFixed(2) : "0.00"}`}
            </button>
          </div>

          {/* Slider + editable % box */}
          <div className="flex items-center gap-3 mt-3">
            <PanelSlider
              value={sliderValue}
              max={sliderMax}
              step={sliderMax > 0 ? sliderMax / 1000 : 0.0001}
              onChange={e => {
                const v = parseFloat(e.target.value);
                setSize(v > 0 ? v.toFixed(4) : "");
              }}
              disabled={sliderMax <= 0}
              down={!isLong}
            />
            <div className="flex items-center h-8 w-16 shrink-0 rounded-md border border-line bg-surface-2 px-2 focus-within:border-line-strong transition-colors">
              <input
                type="number"
                min="0"
                max="100"
                value={sliderMax > 0 ? Math.min(100, Math.round((sliderValue / sliderMax) * 100)) : 0}
                onChange={e => {
                  if (sliderMax <= 0) return;
                  const p = clamp(parseFloat(e.target.value) || 0, 0, 100);
                  const v = (p / 100) * sliderMax;
                  setSize(v > 0 ? v.toFixed(4) : "");
                }}
                disabled={sliderMax <= 0}
                className="w-full bg-transparent text-right text-[13px] num text-white focus:outline-none"
              />
              <span className="text-[12px] text-ink-faint ml-1">%</span>
            </div>
          </div>
        </div>

        {/* ── Limit price (optional on-chain execution bound) ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] text-ink-faint">
              Limit price <span className="text-ink-ghost">(optional)</span>
            </label>
            <button
              type="button"
              className="text-[11px] text-ink-faint hover:text-ink font-medium transition-colors"
              onClick={() => setPriceLimit(market.markPriceRaw ? String(market.markPriceRaw) : "")}
            >
              Use mark
            </button>
          </div>
          <div className="flex items-center gap-2 h-11 rounded-lg border border-line bg-surface-2 px-3 focus-within:border-line-strong transition-colors">
            <input
              type="number"
              placeholder="Market"
              className="flex-1 min-w-0 bg-transparent text-[14px] text-white focus:outline-none placeholder-ink-ghost num"
              min="0"
              value={priceLimit}
              onKeyDown={e => e.key === "-" && e.preventDefault()}
              onChange={e => {
                const v = e.target.value;
                if (v === "" || parseFloat(v) >= 0) setPriceLimit(v);
              }}
            />
            <span className="text-[12px] text-ink-faint shrink-0">USDC</span>
          </div>
          <div className="mt-1.5 text-[10px] leading-4 text-ink-faint">
            {isLong
              ? "Order executes only if the vAMM cost is at or below this price."
              : "Order executes only if the vAMM output is at or above this price."}
          </div>
        </div>

        {/* ── Inline preflight error (local, simulation, and position blockers) ── */}
        {(isOverMax || preflightError) && (() => {
          const diag = preflightError || { severity: "error", message: invalidReason || "Order is not executable." };
          const isWarning = diag.severity === "warning";
          return (
            <div className={`rounded-md border px-3 py-2 text-[11px] leading-4 ${
              isWarning
                ? "border-yellow-500/20 bg-yellow-500/[0.06] text-yellow-300"
                : "border-red-500/20 bg-red-500/[0.06] text-red-300"
            }`}>
              {diag.title && (
                <div className="font-semibold mb-0.5">{diag.title}</div>
              )}
              <div>{diag.message}</div>
              {diag.actionLabel && diag.actionHref && (
                <a href={diag.actionHref} className="mt-1 inline-block underline opacity-80 hover:opacity-100">
                  {diag.actionLabel} →
                </a>
              )}
            </div>
          );
        })()}

        {/* ── Place order ── */}
        <button
          className={`w-full h-12 rounded-lg font-semibold text-white text-[15px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            isLong
              ? "bg-up-solid hover:brightness-110"
              : "bg-down-solid hover:brightness-110"
          }`}
          onClick={handleTrade}
          disabled={isTradeBusy || isSimulating || !size || sizeNum <= 0 || isOverMax}
        >
          {isSimulating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Checking…
            </>
          ) : isTradeBusy ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing
            </>
          ) : (
            extraMarginRaw > 0n ? "Place order · 2 steps" : "Place Market Order"
          )}
        </button>

        {/* ── Order details ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-faint">Order Size:</span>
            <span className="num text-white">
              {sizeNum > 0 ? `${sizeNum.toFixed(4)} ${market.baseAsset}` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-faint">{orderInputMode === "notional" ? "Executable Notional:" : "Notional:"}</span>
            <span className="num text-white">{preview.notional > 0n ? formatUsd(preview.notional) : "—"}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-faint">Est. Price:</span>
            <span className="num text-white">{executionPrice > 0 ? `$${executionPrice.toFixed(2)}` : "—"}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-faint flex items-center gap-1">
              Est. Liq. Price:
              <InfoTooltip title="Liquidation Price" description="Price level where margin approaches maintenance requirements using current order and risk inputs." />
            </span>
            <span className="num text-warn">{sizeNum > 0 ? `$${liqPrice}` : "—"}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-faint flex items-center gap-1">
              Position Margin:
              <InfoTooltip title="Position Margin" description="Margin currently backing your position and the projected margin after this order." />
            </span>
            <span className="num text-white">
              {sizeNum > 0
                ? `$${toNumber(position?.margin).toFixed(2)} → $${toNumberX18(preview.finalMargin || targetMarginRaw).toFixed(2)}`
                : `$${toNumber(position?.margin).toFixed(2)}`}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-faint">Fees ({(feeBps / 100).toFixed(2)}%):</span>
            <span className="num text-ink-muted">{preview.fee > 0n ? formatUsd(preview.fee) : "—"}</span>
          </div>
        </div>

        {/* ── Risk parameters (collapsible — kept available without crowding the form) ── */}
        <details className="group border-t border-line-subtle pt-3">
          <summary className="flex items-center gap-1.5 cursor-pointer list-none select-none">
            <ShieldCheck size={11} strokeWidth={1.75} className="text-ink-faint" />
            <span className="text-[11px] font-medium text-ink-faint uppercase tracking-[0.14em]">Risk parameters</span>
            <ChevronDown size={13} className="text-ink-faint ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2.5 space-y-1">
            <SummaryRow
              label="IMR / MMR"
              value={`${riskParams?.imrPercent ? riskParams.imrPercent.toFixed(1) : "10.0"}% / ${riskParams?.mmrPercent ? riskParams.mmrPercent.toFixed(1) : "5.0"}%`}
              valueClass="text-ink-muted"
              tooltip={{ title: "Initial / Maintenance Margin", desc: "IMR is the minimum margin to open a position. MMR is the minimum to keep it open before liquidation." }}
            />
            <SummaryRow
              label="Risk price"
              value={riskPrice > 0 ? `$${riskPrice.toFixed(2)}` : "—"}
              valueClass="text-ink-muted"
              tooltip={{ title: "Risk Price", desc: "The higher of mark, index, or order price used to estimate contract margin." }}
            />
            <SummaryRow
              label="Min / Max size"
              value={`${riskParams?.minPositionSize ? Number(riskParams.minPositionSize).toFixed(2) : "0.00"} / ${riskParams?.maxPositionSize && Number(riskParams.maxPositionSize) > 0 ? Number(riskParams.maxPositionSize).toFixed(2) : "∞"}`}
              valueClass="text-ink-muted"
            />
            <SummaryRow
              label="Liq. penalty"
              value={`${riskParams?.liquidationPenaltyPercent ? riskParams.liquidationPenaltyPercent.toFixed(1) : "5.0"}%`}
              valueClass="text-warn"
              tooltip={{ title: "Liquidation Penalty", desc: "Penalty charged on liquidation, split between the liquidator and the insurance fund." }}
            />
          </div>
        </details>
      </div>

      {/* First-ever-trade consent: Risk Disclosure → Privacy Policy (portals to body) */}
      <FirstTradeConsentModal
        isOpen={showConsentModal}
        submitting={consentSubmitting}
        onCancel={() => { if (!consentSubmitting) setShowConsentModal(false); }}
        onConfirm={handleConsentConfirm}
      />
    </div>
  );
};
