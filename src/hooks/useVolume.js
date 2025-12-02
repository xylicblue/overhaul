import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';

export function use24hVolume(vammAddress) {
  const [volume24h, setVolume24h] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    async function fetchVolume() {
      if (!vammAddress || !publicClient) return;

      try {
        setIsLoading(true);
        const blockCount24h = 7200n; // ~12s per block -> 7200 blocks in 24h
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock - blockCount24h;

        const logs = await publicClient.getLogs({
          address: vammAddress,
          event: parseAbiItem('event Swap(address indexed sender, int256 baseDelta, int256 quoteDelta, uint256 avgPriceX18)'),
          fromBlock: fromBlock,
          toBlock: currentBlock,
        });

        let totalVolume = 0n;
        for (const log of logs) {
          // quoteDelta is int256, we need absolute value
          const quoteDelta = log.args.quoteDelta;
          const absQuoteDelta = quoteDelta < 0n ? -quoteDelta : quoteDelta;
          totalVolume += absQuoteDelta;
        }

        // Quote asset is USDC (6 decimals)
        const volumeFormatted = formatUnits(totalVolume, 6);
        
        // Format as currency (e.g. $1,234.56)
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        
        setVolume24h(formatter.format(parseFloat(volumeFormatted)));
      } catch (error) {
        console.error('Error fetching 24h volume:', error);
        setVolume24h(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVolume();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchVolume, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [vammAddress, publicClient]);

  return { volume24h, isLoading };
}
