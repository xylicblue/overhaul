// Component to ensure users are on Sepolia network
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import './NetworkGuard.css';

export function NetworkGuard({ children }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  // If wallet not connected, show children (let connect button handle it)
  if (!isConnected) {
    return <>{children}</>;
  }

  // If on wrong network, show warning
  if (chainId !== sepolia.id) {
    return (
      <div className="network-guard-container">
        <div className="network-warning-card">
          <div className="warning-icon">⚠️</div>
          <h2>Wrong Network Detected</h2>
          <p>
            ByteStrike operates on <strong>Sepolia Testnet</strong>.
            <br />
            You're currently connected to a different network.
          </p>
          
          <div className="network-info">
            <div className="info-row">
              <span className="label">Current Network:</span>
              <span className="value wrong">{getNetworkName(chainId)}</span>
            </div>
            <div className="info-row">
              <span className="label">Required Network:</span>
              <span className="value correct">Sepolia Testnet</span>
            </div>
          </div>

          <button
            onClick={() => switchChain({ chainId: sepolia.id })}
            disabled={isPending}
            className="switch-network-button"
          >
            {isPending ? (
              <>
                <span className="spinner">⏳</span> Switching...
              </>
            ) : (
              <>
                <span className="icon">🔄</span> Switch to Sepolia
              </>
            )}
          </button>

          <div className="help-section">
            <p className="help-text">
              <strong>Need Sepolia ETH for gas?</strong>
              <br />
              Get free testnet ETH from:{' '}
              <a
                href="https://sepoliafaucet.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sepolia Faucet ↗
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If on correct network, render children
  return <>{children}</>;
}

// Helper to get network name from chain ID
function getNetworkName(chainId) {
  const networks = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    11155111: 'Sepolia Testnet',
    137: 'Polygon Mainnet',
    80001: 'Mumbai Testnet',
    42161: 'Arbitrum One',
    10: 'Optimism',
    8453: 'Base',
  };
  return networks[chainId] || `Chain ${chainId}`;
}

export default NetworkGuard;
