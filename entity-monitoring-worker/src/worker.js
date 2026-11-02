import { createServer } from 'node:http';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, formatUnits, http } from 'viem';
import {
  clearingHouseReadAbi,
  collateralDepositedEvent,
  collateralWithdrawnEvent,
  tradeExecutedEvent,
} from './abi.js';
import { compareChainOrder, normalizeMonitoringLog } from './events.js';
import { aggregateAccountEquity } from './equity.js';

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function serializeError(error) {
  return error instanceof Error ? error.message : String(error);
}

export class EntityMonitoringWorker {
  constructor(config) {
    this.config = config;
    this.instanceId = config.instanceId || `${hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.chain = createPublicClient({ transport: http(config.rpcUrl) });
    this.stopping = false;
    this.healthServer = null;
    this.health = {
      status: 'starting',
      isLeader: false,
      latestChainBlock: null,
      lastFinalizedBlock: null,
      lastScannedBlock: null,
      lastSuccessfulCycleAt: null,
      lastError: null,
    };
    this.blockCache = new Map();
    this.lastLeaseRenewedAt = 0;
    this.lastRiskRefreshAt = 0;
  }

  log(message, details = null) {
    const suffix = details ? ` ${JSON.stringify(details)}` : '';
    console.log(`[${new Date().toISOString()}] ${message}${suffix}`);
  }

  async writeHeartbeat(overrides = {}) {
    this.health = { ...this.health, ...overrides };
    if (this.config.dryRun) return;
    const payload = {
      instance_id: this.instanceId,
      worker_name: this.config.workerName,
      chain_id: this.config.chainId,
      contract_address: this.config.clearingHouseAddress.toLowerCase(),
      status: this.health.status,
      is_leader: this.health.isLeader,
      latest_chain_block: this.health.latestChainBlock,
      last_finalized_block: this.health.lastFinalizedBlock,
      last_scanned_block: this.health.lastScannedBlock,
      last_successful_cycle_at: this.health.lastSuccessfulCycleAt,
      last_error: this.health.lastError,
      updated_at: new Date().toISOString(),
    };
    const { error } = await this.supabase
      .from('entity_monitoring_worker_heartbeats')
      .upsert(payload, { onConflict: 'instance_id' });
    if (error) throw new Error(`Heartbeat write failed: ${error.message}`);
  }

  async recordFailure(error) {
    const message = serializeError(error).slice(0, 5000);
    this.health = { ...this.health, status: 'degraded', lastError: message };
    if (this.config.dryRun) return;
    const { error: insertError } = await this.supabase
      .from('entity_monitoring_worker_failures')
      .insert({
        instance_id: this.instanceId,
        worker_name: this.config.workerName,
        chain_id: this.config.chainId,
        contract_address: this.config.clearingHouseAddress.toLowerCase(),
        last_scanned_block: this.health.lastScannedBlock,
        error_message: message,
      });
    if (insertError) console.error(`Could not persist worker failure: ${insertError.message}`);
    await this.writeHeartbeat().catch((heartbeatError) => {
      console.error(`Could not persist degraded heartbeat: ${heartbeatError.message}`);
    });
  }

  async claimLease() {
    if (this.config.dryRun) return true;
    const { data, error } = await this.supabase.rpc('service_claim_entity_monitoring_worker_lease', {
      p_worker_name: this.config.workerName,
      p_instance_id: this.instanceId,
      p_lease_seconds: this.config.leaseSeconds,
    });
    if (error) throw new Error(`Lease claim failed: ${error.message}`);
    if (data === true) this.lastLeaseRenewedAt = Date.now();
    return data === true;
  }

  async renewLeaseIfNeeded() {
    if (this.config.dryRun) return;
    const renewalInterval = Math.floor((this.config.leaseSeconds * 1000) / 3);
    if (Date.now() - this.lastLeaseRenewedAt < renewalInterval) return;
    if (!await this.claimLease()) throw new Error('Worker lease was lost while processing a block range');
  }

  async block(blockNumber) {
    const key = blockNumber.toString();
    if (!this.blockCache.has(key)) {
      this.blockCache.set(key, await this.chain.getBlock({ blockNumber }));
      if (this.blockCache.size > 2000) this.blockCache.delete(this.blockCache.keys().next().value);
    }
    return this.blockCache.get(key);
  }

  async checkpoint() {
    if (this.config.dryRun) return null;
    const { data, error } = await this.supabase
      .from('entity_monitoring_worker_checkpoints')
      .select('last_scanned_block,last_scanned_block_hash')
      .eq('worker_name', this.config.workerName)
      .eq('chain_id', this.config.chainId)
      .eq('contract_address', this.config.clearingHouseAddress.toLowerCase())
      .maybeSingle();
    if (error) throw new Error(`Checkpoint read failed: ${error.message}`);
    return data;
  }

  async saveCheckpoint(blockNumber, blockHash) {
    if (this.config.dryRun) return blockNumber;
    const { data, error } = await this.supabase.rpc(
      'service_advance_entity_monitoring_worker_checkpoint',
      {
        p_worker_name: this.config.workerName,
        p_instance_id: this.instanceId,
        p_chain_id: this.config.chainId,
        p_contract_address: this.config.clearingHouseAddress.toLowerCase(),
        p_last_scanned_block: Number(blockNumber),
        p_last_scanned_block_hash: blockHash.toLowerCase(),
      },
    );
    if (error) throw new Error(`Checkpoint write failed: ${error.message}`);
    return BigInt(data);
  }

  async resolveStartBlock() {
    const checkpoint = await this.checkpoint();
    if (!checkpoint) return this.config.startBlock;
    const lastScanned = BigInt(checkpoint.last_scanned_block);
    const canonical = await this.block(lastScanned);
    if (canonical.hash.toLowerCase() !== checkpoint.last_scanned_block_hash.toLowerCase()) {
      throw new Error(`Finalized-chain checkpoint mismatch at block ${lastScanned}; manual reconciliation is required`);
    }
    return lastScanned + 1n;
  }

  async loadLogs(fromBlock, toBlock) {
    const options = { address: this.config.clearingHouseAddress, fromBlock, toBlock };
    const [trades, deposits, withdrawals] = await Promise.all([
      this.chain.getLogs({ ...options, event: tradeExecutedEvent }),
      this.chain.getLogs({ ...options, event: collateralDepositedEvent }),
      this.chain.getLogs({ ...options, event: collateralWithdrawnEvent }),
    ]);
    return [...trades, ...deposits, ...withdrawals].sort(compareChainOrder);
  }

  async accountEquity(walletAddress, blockNumber) {
    try {
      const freeCollateral = await this.chain.readContract({
        address: this.config.clearingHouseAddress,
        abi: clearingHouseReadAbi,
        functionName: 'getAccountValue',
        args: [walletAddress],
        blockNumber,
      });
      const positionResults = await Promise.all(this.config.markets.map(async (market) => {
        try {
          const position = await this.chain.readContract({
            address: this.config.clearingHouseAddress,
            abi: clearingHouseReadAbi,
            functionName: 'getPosition',
            args: [walletAddress, market.marketId],
            blockNumber,
          });
          const size = position.size ?? position[0];
          return size === 0n ? null : market;
        } catch {
          return null;
        }
      }));
      const activeMarkets = positionResults.filter(Boolean);
      const positions = await Promise.all(activeMarkets.map(async (market) => {
        const [notionalX18, marginRatioX18] = await Promise.all([
          this.chain.readContract({
            address: this.config.clearingHouseAddress,
            abi: clearingHouseReadAbi,
            functionName: 'getNotional',
            args: [walletAddress, market.marketId],
            blockNumber,
          }),
          this.chain.readContract({
            address: this.config.clearingHouseAddress,
            abi: clearingHouseReadAbi,
            functionName: 'getMarginRatio',
            args: [walletAddress, market.marketId],
            blockNumber,
          }),
        ]);
        return { notionalX18, marginRatioX18 };
      }));
      return formatUnits(aggregateAccountEquity(freeCollateral, positions), 18);
    } catch (error) {
      this.log('Account-equity read unavailable; event will retain a null equity value', {
        wallet: walletAddress.toLowerCase(),
        block: Number(blockNumber),
        error: serializeError(error),
      });
      return null;
    }
  }

  async refreshDueRiskSnapshots(blockNumber) {
    if (this.config.dryRun) return { refreshed: 0, skipped: 0 };
    if (Date.now() - this.lastRiskRefreshAt < this.config.riskRefreshIntervalMs) {
      return { refreshed: 0, skipped: 0 };
    }
    const intervalMinutes = Math.max(1, Math.floor(this.config.riskRefreshIntervalMs / 60000));
    const { data: wallets, error } = await this.supabase.rpc('service_entity_monitoring_wallets_due', {
      p_limit: this.config.riskRefreshBatchSize,
      p_interval_minutes: intervalMinutes,
    });
    if (error) throw new Error(`Due-wallet query failed: ${error.message}`);

    const totals = { refreshed: 0, skipped: 0 };
    for (const item of wallets || []) {
      await this.renewLeaseIfNeeded();
      const equity = await this.accountEquity(item.wallet_address, blockNumber);
      if (equity === null) {
        totals.skipped += 1;
        continue;
      }
      const { error: refreshError } = await this.supabase.rpc('service_recalculate_entity_live_risk', {
        p_wallet_address: item.wallet_address,
        p_account_equity_usd: equity,
        p_observed_at: new Date().toISOString(),
      });
      if (refreshError) throw new Error(`Scheduled risk recalculation failed for ${item.wallet_address}: ${refreshError.message}`);
      totals.refreshed += 1;
    }
    this.lastRiskRefreshAt = Date.now();
    return totals;
  }

  async record(log) {
    const normalized = normalizeMonitoringLog(log, this.config.collateralDecimals);
    if (
      normalized.tokenAddress
      && normalized.tokenAddress.toLowerCase() !== this.config.collateralTokenAddress.toLowerCase()
    ) {
      throw new Error(
        `Unsupported collateral token ${normalized.tokenAddress}; configure an explicit conversion before ingestion`,
      );
    }
    const block = await this.block(log.blockNumber);
    const accountEquity = await this.accountEquity(normalized.walletAddress, log.blockNumber);
    const contractAddress = this.config.clearingHouseAddress.toLowerCase();
    const transactionHash = log.transactionHash.toLowerCase();
    const logIndex = Number(log.logIndex ?? 0);
    const params = {
      p_event_key: `${this.config.chainId}:${contractAddress}:${transactionHash}:${logIndex}`,
      p_event_type: normalized.eventType,
      p_wallet_address: normalized.walletAddress.toLowerCase(),
      p_chain_id: this.config.chainId,
      p_contract_address: contractAddress,
      p_token_address: normalized.tokenAddress?.toLowerCase() || null,
      p_transaction_hash: transactionHash,
      p_log_index: logIndex,
      p_block_number: Number(log.blockNumber),
      p_amount_raw: normalized.amountRaw.toString(),
      p_amount_usd: formatUnits(normalized.amountRaw, normalized.decimals),
      p_account_equity_usd: accountEquity,
      p_occurred_at: new Date(Number(block.timestamp) * 1000).toISOString(),
      p_payload: normalized.payload,
    };

    if (this.config.dryRun) {
      this.log('Dry-run event', { type: normalized.eventType, block: params.p_block_number, wallet: params.p_wallet_address });
      return { recorded: false, reason: 'dry_run' };
    }

    const { data, error } = await this.supabase.rpc('service_record_entity_monitoring_event', params);
    if (error) throw new Error(`Monitoring RPC failed for ${params.p_event_key}: ${error.message}`);
    return data;
  }

  async processRange(fromBlock, toBlock) {
    const logs = await this.loadLogs(fromBlock, toBlock);
    const totals = { logs: logs.length, recorded: 0, duplicates: 0, unmapped: 0 };
    for (const log of logs) {
      await this.renewLeaseIfNeeded();
      const result = await this.record(log);
      if (result?.recorded) totals.recorded += 1;
      else if (result?.reason === 'duplicate') totals.duplicates += 1;
      else if (result?.reason === 'wallet_not_mapped') totals.unmapped += 1;
    }
    return totals;
  }

  async cycle() {
    const isLeader = await this.claimLease();
    if (!isLeader) {
      await this.writeHeartbeat({ status: 'standby', isLeader: false, lastError: null });
      return;
    }

    const latest = await this.chain.getBlockNumber();
    const finalized = latest > this.config.finalityConfirmations
      ? latest - this.config.finalityConfirmations
      : 0n;
    let nextBlock = await this.resolveStartBlock();
    await this.writeHeartbeat({
      status: 'running',
      isLeader: true,
      latestChainBlock: Number(latest),
      lastFinalizedBlock: Number(finalized),
      lastError: null,
    });

    while (!this.stopping && nextBlock <= finalized) {
      if (!await this.claimLease()) {
        await this.writeHeartbeat({ status: 'standby', isLeader: false });
        return;
      }
      const toBlock = nextBlock + this.config.blockChunkSize - 1n > finalized
        ? finalized
        : nextBlock + this.config.blockChunkSize - 1n;
      const totals = await this.processRange(nextBlock, toBlock);
      const lastBlock = await this.block(toBlock);
      const savedBlock = await this.saveCheckpoint(toBlock, lastBlock.hash);
      await this.writeHeartbeat({
        status: 'running',
        isLeader: true,
        latestChainBlock: Number(latest),
        lastFinalizedBlock: Number(finalized),
        lastScannedBlock: Number(savedBlock),
        lastSuccessfulCycleAt: new Date().toISOString(),
        lastError: null,
      });
      this.log('Finalized block range processed', {
        fromBlock: Number(nextBlock),
        toBlock: Number(toBlock),
        ...totals,
      });
      nextBlock = savedBlock + 1n;
    }

    if (nextBlock > finalized) {
      const riskRefresh = await this.refreshDueRiskSnapshots(finalized);
      await this.writeHeartbeat({
        status: 'running',
        isLeader: true,
        latestChainBlock: Number(latest),
        lastFinalizedBlock: Number(finalized),
        lastSuccessfulCycleAt: new Date().toISOString(),
        lastError: null,
      });
      if (riskRefresh.refreshed || riskRefresh.skipped) {
        this.log('Scheduled live-risk refresh completed', riskRefresh);
      }
    }
  }

  startHealthServer() {
    this.healthServer = createServer((request, response) => {
      const healthy = this.health.status !== 'degraded';
      if (request.url !== '/health' && request.url !== '/ready') {
        response.writeHead(404, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'not_found' }));
        return;
      }
      response.writeHead(healthy ? 200 : 503, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        worker: this.config.workerName,
        instanceId: this.instanceId,
        dryRun: this.config.dryRun,
        ...this.health,
      }));
    });
    this.healthServer.listen(this.config.port, '0.0.0.0', () => {
      this.log(`Health endpoint listening on port ${this.config.port}`);
    });
  }

  async run() {
    this.startHealthServer();
    this.log('Independent entity-monitoring worker starting', {
      instanceId: this.instanceId,
      chainId: this.config.chainId,
      clearingHouse: this.config.clearingHouseAddress,
      collateralToken: this.config.collateralTokenAddress,
      configuredMarkets: this.config.markets.length,
      startBlock: Number(this.config.startBlock),
      dryRun: this.config.dryRun,
    });
    await this.writeHeartbeat({ status: 'starting', isLeader: false });

    do {
      try {
        await this.cycle();
        if (this.config.runOnce) break;
        await sleep(this.config.pollIntervalMs);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Monitoring cycle failed: ${serializeError(error)}`);
        await this.recordFailure(error);
        if (this.config.runOnce) throw error;
        await sleep(this.config.retryDelayMs);
      }
    } while (!this.stopping);
  }

  async stop() {
    if (this.stopping) return;
    this.stopping = true;
    await this.writeHeartbeat({ status: 'stopped', isLeader: false }).catch(() => {});
    await new Promise((resolve) => this.healthServer?.close(resolve));
    this.log('Worker stopped');
  }
}
