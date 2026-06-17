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
import { Info, ShieldCheck } from "lucide-react";
import { getSepoliaTxUrl } from "./utils/transactionErrors";
import { diagnoseOpenPositionError, diagnoseFundingBlocker } from "./utils/tradeFailureDiagnosis";
import {
  ZERO_PREVIEW,
  buildOpenOrderPreview,
  findBaseSizeForNotional,
  findMaxOpenSize,
  formatX18Number,
  toNumberX18,
} from "./utils/orderPreview";
import FirstTradeConsentModal from "./components/FirstTradeConsentModal";
import { hasAcceptedTradingConsent, acceptTradingConsent } from "./services/privacyAck";

const DEFAULT_FEE_BPS = 10;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const WAD = 10n ** 18n;
const T4_TARGET_LEVERAGE_MARKET_ID = MARKET_IDS["T4-PERP"];
const MIN_TARGET_LEVERAGE = 1;
const MAX_TARGET_LEVERAGE = 10;

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
// SectionLabel — small uppercase label used to group sections
// ─────────────────────────────────────────────────────────────────────────────
const SectionLabel = ({ children, right }) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-[0.14em]">{children}</span>
    {right}
  </div>
);

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
  const targetLeverageEnabled    = marketId === T4_TARGET_LEVERAGE_MARKET_ID;
  const { riskParams }           = useMarketRiskParams(marketId);
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
    isPending,
    isConfirming,
    isSuccess,
    error: tradeError,
    receiptError,
    hash,
    reset: resetTrade,
  } = useOpenPosition(marketId);
  const {
    addMargin,
    isPending: isAddMarginPending,
    reset: resetAddMargin,
  } = useAddMargin(marketId);

  const { positions: allPositions } = useAllPositions();
  const [preflightError, setPreflightError] = useState(null);
  const [isSimulating,   setIsSimulating]   = useState(false);
  const [isAddingTargetMargin, setIsAddingTargetMargin] = useState(false);
  const [orderInputMode, setOrderInputMode] = useState("base");
  const [targetLeverage, setTargetLeverage] = useState(MAX_TARGET_LEVERAGE);

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
  const { position } = usePosition(marketId, address);
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
    if (imrBps <= 0) return MAX_TARGET_LEVERAGE;
    return clamp(10000 / imrBps, MIN_TARGET_LEVERAGE, MAX_TARGET_LEVERAGE);
  }, [riskParams?.imrBps]);
  const selectedTargetLeverage = targetLeverageEnabled
    ? clamp(targetLeverage, MIN_TARGET_LEVERAGE, maxSelectableLeverage)
    : targetLeverage;

  useEffect(() => {
    if (!targetLeverageEnabled) {
      lastTargetLeverageMarketRef.current = null;
      return;
    }

    const marketChanged = lastTargetLeverageMarketRef.current !== marketId;
    lastTargetLeverageMarketRef.current = marketId;

    setTargetLeverage((current) => {
      if (marketChanged) return maxSelectableLeverage;
      return clamp(current || maxSelectableLeverage, MIN_TARGET_LEVERAGE, maxSelectableLeverage);
    });
  }, [targetLeverageEnabled, marketId, maxSelectableLeverage]);

  // ── Calculations (memoised — only rerun when inputs actually change) ───────
  const {
    effectiveBalance, currentPrice, marketPrice, executionPrice,
    maxSize, maxNotional, sizeNum, inputNum, sliderMax, sliderValue,
    derivedLeverage, riskPrice, feeBps, liqPrice, isOverMax, invalidReason,
    preview, amountLimit, protocolSize, targetMarginRaw, extraMarginRaw,
    targetTotalRequiredRaw, targetMarginOverAvailable,
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
    const targetLeverageRaw = targetLeverageEnabled ? parseX18Input(selectedTargetLeverage.toString()) : 0n;
    const targetMarginRaw = targetLeverageEnabled && preview.ok && preview.riskNotional > 0n && targetLeverageRaw > 0n
      ? (preview.riskNotional * WAD + targetLeverageRaw - 1n) / targetLeverageRaw
      : preview.initialMargin;
    const extraMarginRaw = targetLeverageEnabled && targetMarginRaw > preview.initialMargin
      ? targetMarginRaw - preview.initialMargin
      : 0n;
    const targetTotalRequiredRaw = preview.totalRequired + extraMarginRaw;
    const targetMarginOverAvailable = targetLeverageEnabled && inputX18 > 0n && preview.ok && quoteFreeCollateralRaw < targetTotalRequiredRaw;

    return {
      effectiveBalance,
      currentPrice,
      marketPrice,
      executionPrice: toNumberX18(preview.avgPrice),
      maxSize,
      maxNotional,
      sizeNum,
      inputNum,
      sliderMax: orderInputMode === "notional" ? maxNotional : maxSize,
      sliderValue: orderInputMode === "notional" ? inputNum : sizeNum,
      fees: toNumberX18(preview.fee),
      marginRequired: toNumberX18(preview.initialMargin),
      collateralRequired: toNumberX18(preview.totalRequired),
      derivedLeverage: toNumberX18(preview.effectiveLeverageX18),
      riskPrice: toNumberX18(preview.postTradeMark > previewParams.oraclePrice ? preview.postTradeMark : previewParams.oraclePrice),
      feeBps,
      liqPrice: preview.liqPrice > 0n ? formatX18Number(preview.liqPrice, 2) : "—",
      isOverMax: inputX18 > 0n && (!preview.ok || targetMarginOverAvailable),
      invalidReason: inputX18 > 0n
        ? (targetMarginOverAvailable ? "Insufficient quote collateral for selected leverage" : preview.reason)
        : null,
      preview,
      amountLimit: preview.amountLimit,
      protocolSize,
      targetMarginRaw,
      extraMarginRaw,
      targetTotalRequiredRaw,
      targetMarginOverAvailable,
    };
  }, [
    quoteValueRaw, reservedMarginRaw, market?.markPriceRaw, market?.price, market?.oraclePriceRaw,
    market?.feeBps, priceLimit, riskParams, marketConfig, reserves.baseReserveRaw,
    reserves.quoteReserveRaw, reserves.minReserveBaseRaw, reserves.minReserveQuoteRaw,
    reserves.feeBps, selectedMarket?.feeBps, size, isLong, position?.sizeRaw, orderInputMode,
    targetLeverageEnabled, selectedTargetLeverage,
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

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!selectedMarket) return <div className="flex items-center justify-center h-full text-ink-faint text-xs">Select a market</div>;
  if (isLoading)        return <div className="flex items-center justify-center h-full text-ink-faint text-xs">Loading…</div>;
  if (error || !market) return <div className="flex items-center justify-center h-full text-red-500 text-xs">Error loading market</div>;

  const isTradeBusy = isPending || isAddMarginPending || isAddingTargetMargin;

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
    if (targetMarginOverAvailable) {
      const diag = {
        severity: "error",
        title: "Insufficient Collateral",
        message: "Available quote collateral cannot support the selected T4 leverage.",
      };
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
    let openConfirmed = false;
    const needsPostOpenMargin = targetLeverageEnabled && extraMarginRaw > 0n;
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
        deferOpenSuccess: needsPostOpenMargin,
      };
      toast.loading("Review order transaction in wallet...", { id: "trade" });
      openSubmittedHash = await openPosition(isLong, protocolSize, amountLimit);

      if (!needsPostOpenMargin) return;
      if (!openSubmittedHash || !publicClient) {
        throw new Error("Position submitted, but the app could not confirm the transaction before adding margin.");
      }

      toast.loading("Submitted, waiting for confirmation...", { id: "trade" });
      const openReceipt = await publicClient.waitForTransactionReceipt({ hash: openSubmittedHash });
      if (openReceipt?.status === "reverted") {
        throw new Error("Position transaction reverted.");
      }
      openConfirmed = true;

      await saveSubmittedTrade(submittedOpenOrderRef.current, openSubmittedHash);
      setIsAddingTargetMargin(true);
      toast.loading("Review add margin transaction in wallet...", { id: "trade" });
      const marginHash = await addMargin(formatX18Input(extraMarginRaw));
      if (!marginHash || !publicClient) {
        throw new Error("Position opened, but the app could not confirm the add-margin transaction.");
      }

      toast.loading("Adding margin...", { id: "trade" });
      const marginReceipt = await publicClient.waitForTransactionReceipt({ hash: marginHash });
      if (marginReceipt?.status === "reverted") {
        throw new Error("Add margin transaction reverted.");
      }

      setLastTx(openSubmittedHash, submittedOpenOrderRef.current?.txActionText || side);
      toast.success(
        <div>
          <div>{submittedOpenOrderRef.current?.sideLabel || "Position"} opened.</div>
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
      const diag = needsPostOpenMargin && openSubmittedHash && openConfirmed
        ? {
            severity: "error",
            title: "Margin Not Added",
            message: "Position opened, but the selected T4 leverage margin was not added. Add margin from the position panel to reach the intended leverage.",
          }
        : diagnoseOpenPositionError(err, { marketName: market.name });
      if (needsPostOpenMargin && openSubmittedHash && openConfirmed) {
        setLastTx(openSubmittedHash, submittedOpenOrderRef.current?.txActionText || side);
      }
      setPreflightError(diag);
      toast.error(diag.message, { id: "trade" });
    } finally {
      setIsAddingTargetMargin(false);
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

      {/* ── Direction toggle ────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <div className="grid grid-cols-2 gap-px bg-line rounded-md overflow-hidden p-px">
          <button
            onClick={() => setSide("Buy")}
            className={`py-2 text-[12px] font-semibold transition-colors duration-100 ${
              isLong
                ? "bg-up-solid text-white"
                : "bg-surface-2 text-ink-muted hover:text-ink"
            }`}
          >
            Long
          </button>
          <button
            onClick={() => setSide("Sell")}
            className={`py-2 text-[12px] font-semibold transition-colors duration-100 ${
              !isLong
                ? "bg-down-solid text-white"
                : "bg-surface-2 text-ink-muted hover:text-ink"
            }`}
          >
            Short
          </button>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">

        {/* Key stats row — separated by a faint full-width surface band, not a border */}
        <div className="grid grid-cols-3 px-3 py-3 bg-surface-2/30">
          {[
            { label: "Balance", value: `$${effectiveBalance.toFixed(2)}`,                      align: "items-start" },
            { label: "Mark",    value: currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "—", align: "items-center" },
            {
              label: "Max",
              value: orderInputMode === "notional"
                ? (maxNotional > 0 ? `$${maxNotional.toFixed(2)}` : "—")
                : (maxSize > 0 ? maxSize.toFixed(2) : "—"),
              align: "items-end",
            },
          ].map(({ label, value, align }) => (
            <div key={label} className={`flex flex-col gap-1.5 ${align}`}>
              <span className="stat-label">{label}</span>
              <span className="stat-value text-[13px] truncate">{value}</span>
            </div>
          ))}
        </div>

        {/* Order */}
        <div className="px-3 py-3 border-b border-line-subtle space-y-3">
          <SectionLabel
            right={
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-ink font-medium">Market</span>
                <span className="text-ink-ghost cursor-not-allowed">Limit<span className="ml-1 text-[9px] text-ink-ghost">soon</span></span>
              </div>
            }
          >
            Order
          </SectionLabel>

          <div className="grid grid-cols-2 gap-px bg-line rounded-md overflow-hidden p-px">
            {[
              { key: "base", label: "GPU Hours" },
              { key: "notional", label: "USDC Notional" },
            ].map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => {
                  if (orderInputMode !== mode.key) {
                    setOrderInputMode(mode.key);
                    setSize("");
                  }
                }}
                className={`py-1.5 text-[11px] font-medium transition-colors duration-100 ${
                  orderInputMode === mode.key
                    ? "bg-surface-3 text-ink"
                    : "bg-surface-1 text-ink-faint hover:text-ink-muted"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Size */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.14em]">
                {orderInputMode === "notional" ? "Notional" : "Size"}
              </label>
              <span className="text-[10px] text-ink-faint font-mono tabular-nums">
                Max {orderInputMode === "notional"
                  ? `$${maxNotional > 0 ? maxNotional.toFixed(2) : "0.00"}`
                  : `${maxSize > 0 ? maxSize.toFixed(2) : "0.00"} ${market.baseAsset}`}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="0.0000"
                className="w-full bg-surface-2 border border-line-subtle rounded-md pl-3 pr-16 py-2 text-[13px] text-white focus:outline-none focus:border-line-strong transition-colors duration-150 placeholder-ink-ghost num"
                min="0"
                value={size}
                onKeyDown={e => e.key === "-" && e.preventDefault()}
                onChange={e => {
                  const v = e.target.value;
                  if (v === "" || parseFloat(v) >= 0) setSize(v);
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-ink-faint">
                {orderInputMode === "notional" ? "USDC" : market.baseAsset}
              </span>
            </div>
            {orderInputMode === "notional" && (
              <div className="mt-1.5 flex items-center justify-between text-[10px] leading-4">
                <span className="text-ink-faint">Derived size</span>
                <span className="font-mono tabular-nums text-ink-muted">
                  {sizeNum > 0 ? `${sizeNum.toFixed(6)} ${market.baseAsset}` : `— ${market.baseAsset}`}
                </span>
              </div>
            )}
            {/* Size slider — 0 to maxSize, tick dots at 0/25/50/75/100% */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 relative h-5 flex items-center">
                <div className="relative w-full h-[2px] bg-surface-3 rounded-full">
                  {/* Fill */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-white/70"
                    style={{ width: sliderMax > 0 ? `${Math.min(100, (sliderValue / sliderMax) * 100)}%` : "0%" }}
                  />
                  {/* Tick dots at 0, 25, 50, 75, 100% */}
                  {[0, 25, 50, 75, 100].map(pct => {
                    const filled = sliderMax > 0 && (sliderValue / sliderMax) * 100 >= pct && sliderValue > 0;
                    return (
                      <div
                        key={pct}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full pointer-events-none"
                        style={{
                          left: `${pct}%`,
                          backgroundColor: filled ? "rgba(255,255,255,0.8)" : "#3f3f46",
                        }}
                      />
                    );
                  })}
                  {/* Thumb — always visible, calc() keeps it in bounds at 0% and 100% */}
                  {sliderMax > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none z-10"
                      style={{
                        left: `calc(${Math.min(100, (sliderValue / sliderMax) * 100)}% - ${(Math.min(100, (sliderValue / sliderMax) * 100) / 100) * 12}px)`,
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 0 3px rgba(255,255,255,0.15)",
                      }}
                    />
                  )}
                  {/* Native input spanning full hit area */}
                  <input
                    type="range"
                    min="0"
                    max={sliderMax > 0 ? sliderMax : 1}
                    step={sliderMax > 0 ? sliderMax / 1000 : 0.0001}
                    value={sliderValue || 0}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      setSize(v > 0 ? v.toFixed(4) : "");
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    disabled={sliderMax <= 0}
                  />
                </div>
              </div>
              {/* Current % of max */}
              <span className={`shrink-0 w-10 text-right text-[11px] font-mono tabular-nums ${
                sliderValue > 0 ? (isLong ? "text-up" : "text-down") : "text-ink-faint"
              }`}>
                {sliderMax > 0 ? `${Math.min(100, Math.round((sliderValue / sliderMax) * 100))}%` : "0%"}
              </span>
            </div>
          </div>

          {/* Price limit */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.14em]">Price limit</label>
              <button
                className="text-[10px] text-ink-faint hover:text-ink font-medium transition-colors duration-150"
                onClick={() => setPriceLimit(market.markPriceRaw ? String(market.markPriceRaw) : "")}
              >
                Use mark
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="Market"
                className="w-full bg-surface-2 border border-line-subtle rounded-md pl-3 pr-12 py-2 text-[13px] text-white focus:outline-none focus:border-line-strong transition-colors duration-150 placeholder-ink-ghost num"
                min="0"
                value={priceLimit}
                onKeyDown={e => e.key === "-" && e.preventDefault()}
                onChange={e => {
                  const v = e.target.value;
                  if (v === "" || parseFloat(v) >= 0) setPriceLimit(v);
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-ink-faint">
                USDC
              </span>
            </div>
          </div>

          {/* Effective leverage */}
          <div>
            <label className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.14em] block mb-3">
              Effective leverage
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative h-5 flex items-center">
                <div className="relative w-full h-[2px] bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${isLong ? "bg-up" : "bg-down"}`}
                    style={{
                      width: targetLeverageEnabled
                        ? `${Math.min(100, (selectedTargetLeverage / maxSelectableLeverage) * 100)}%`
                        : `${Math.min(100, (derivedLeverage / 10) * 100)}%`,
                    }}
                  />
                </div>
                {targetLeverageEnabled && (
                  <input
                    type="range"
                    min={MIN_TARGET_LEVERAGE}
                    max={maxSelectableLeverage}
                    step="0.25"
                    value={selectedTargetLeverage}
                    onChange={(e) => {
                      const next = Number.parseFloat(e.target.value);
                      if (Number.isFinite(next)) {
                        setTargetLeverage(clamp(next, MIN_TARGET_LEVERAGE, maxSelectableLeverage));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                )}
              </div>
              <span
                className={`shrink-0 w-12 text-right text-[13px] font-mono font-semibold tabular-nums ${
                  isLong ? "text-up" : "text-down"
                }`}
              >
                {targetLeverageEnabled
                  ? `${selectedTargetLeverage.toFixed(2)}×`
                  : (derivedLeverage > 0 ? `${derivedLeverage.toFixed(2)}×` : "—")}
              </span>
            </div>
          </div>
        </div>

        {/* Order summary — clean key/value list */}
        <div className="px-3 py-3 border-b border-line-subtle space-y-1">
          <SummaryRow
            label="Size"
            value={sizeNum > 0 ? `${sizeNum.toFixed(6)} ${market.baseAsset}` : "—"}
          />
          <SummaryRow
            label={orderInputMode === "notional" ? "Executable notional" : "Notional"}
            value={preview.notional > 0n ? formatUsd(preview.notional) : "—"}
          />
          <SummaryRow
            label={`Fees (${(feeBps / 100).toFixed(2)}%)`}
            value={preview.fee > 0n ? formatUsd(preview.fee) : "—"}
            valueClass="text-ink-muted"
          />
          <SummaryRow
            label="Initial margin"
            value={preview.initialMargin > 0n ? formatUsd(preview.initialMargin) : "—"}
            valueClass="text-ink font-medium"
            tooltip={{ title: "Initial Margin", desc: "Collateral reserved by the contract using market IMR and the higher of post-trade mark or index price." }}
          />
          <SummaryRow
            label="Total required"
            value={targetTotalRequiredRaw > 0n ? formatUsd(targetTotalRequiredRaw) : "—"}
            valueClass={isOverMax ? "text-down font-medium" : "text-ink-muted"}
            tooltip={{ title: "Total Required", desc: "Initial margin, trading fee, and any extra collateral needed for the selected leverage." }}
          />
          <SummaryRow
            label="Liq. price"
            value={sizeNum > 0 ? `$${liqPrice}` : "—"}
            valueClass="text-warn"
            tooltip={{ title: "Liquidation Price", desc: "Price level where margin approaches maintenance requirements using current order and risk inputs." }}
          />
          {/* Inline preflight error — shown for local, simulation, and position blockers */}
          {(isOverMax || preflightError) && (() => {
            const diag = preflightError || { severity: "error", message: invalidReason || "Order is not executable." };
            const isWarning = diag.severity === "warning";
            return (
              <div className={`mt-2 rounded-md border px-3 py-2 text-[11px] leading-4 ${
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
        </div>

        {/* Risk parameters — low-priority info, integrated */}
        <div className="px-3 py-3 space-y-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShieldCheck size={10} strokeWidth={1.75} className="text-ink-faint" />
            <span className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.14em]">Risk</span>
          </div>
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
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-line-subtle bg-surface-1">
        <button
          className={`w-full h-11 rounded-md font-semibold text-white text-[13px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
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
            <>
              {isLong ? "Long" : "Short"} {market.baseAsset}
              {preview.notional > 0n && (
                <span className="text-white/60 font-normal text-[11px] tabular-nums">· ${toNumberX18(preview.notional).toFixed(0)}</span>
              )}
            </>
          )}
        </button>
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
