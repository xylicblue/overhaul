import React from 'react';
import { useMarketsData } from './marketData';
import { SEPOLIA_CONTRACTS, MARKET_IDS } from './contracts/addresses';

export const DebugMarkets = () => {
  const { markets, isLoading, error } = useMarketsData();

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Markets Debug Page</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Contract Addresses</h2>
        <pre className="bg-gray-800 p-4 rounded text-xs overflow-auto">
          {JSON.stringify({
            vammProxy: SEPOLIA_CONTRACTS.vammProxy,
            vammProxyHyperscalers: SEPOLIA_CONTRACTS.vammProxyHyperscalers,
            vammProxyNonHyperscalers: SEPOLIA_CONTRACTS.vammProxyNonHyperscalers,
          }, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Market IDs</h2>
        <pre className="bg-gray-800 p-4 rounded text-xs overflow-auto">
          {JSON.stringify(MARKET_IDS, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Hook State</h2>
        <div className="bg-gray-800 p-4 rounded">
          <p>Loading: {isLoading ? 'true' : 'false'}</p>
          <p>Error: {error || 'null'}</p>
          <p>Markets Count: {markets.length}</p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Markets Data</h2>
        <pre className="bg-gray-800 p-4 rounded text-xs overflow-auto">
          {JSON.stringify(markets, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Individual Markets</h2>
        {markets.map((market) => (
          <div key={market.name} className="bg-gray-800 p-4 rounded mb-2">
            <h3 className="font-bold">{market.name}</h3>
            <p>Display Name: {market.displayName}</p>
            <p>Mark Price: ${market.markPrice}</p>
            <p>vAMM: {market.vammAddress}</p>
            <p>Status: {market.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
