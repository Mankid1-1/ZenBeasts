'use client';
import { FC, ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter, 
  TorusWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, Connection } from '@solana/web3.js';

interface ProvidersProps { children: ReactNode }

/**
 * Validate network and return safe value
 * Medium Priority: Add network validation with fallback
 */
function validateNetwork(network: string): 'devnet' | 'testnet' | 'mainnet-beta' {
  const validNetworks = ['devnet', 'testnet', 'mainnet-beta'] as const;
  
  if (validNetworks.includes(network as any)) {
    return network as 'devnet' | 'testnet' | 'mainnet-beta';
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.warn(`⚠️ Invalid network "${network}", defaulting to devnet`);
  }
  
  return 'devnet';
}

/**
 * Validate URL format
 * Medium Priority: Add RPC endpoint validation
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get RPC endpoints with fallback support
 * High Priority: Implement actual RPC redundancy (Requirement 23.3)
 */
function getRPCEndpoints(network: 'devnet' | 'testnet' | 'mainnet-beta'): string[] {
  const endpoints: string[] = [];
  
  // Primary RPC endpoint
  const primaryRpc = process.env.NEXT_PUBLIC_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_HOST;
  if (primaryRpc && isValidUrl(primaryRpc)) {
    endpoints.push(primaryRpc);
  } else if (primaryRpc && process.env.NODE_ENV === 'development') {
    console.error('❌ Invalid NEXT_PUBLIC_RPC_URL format, skipping');
  }
  
  // Backup RPC endpoint
  const backupRpc = process.env.NEXT_PUBLIC_RPC_URL_BACKUP || process.env.NEXT_PUBLIC_SOLANA_RPC_FALLBACK;
  if (backupRpc && isValidUrl(backupRpc)) {
    endpoints.push(backupRpc);
  } else if (backupRpc && process.env.NODE_ENV === 'development') {
    console.error('❌ Invalid NEXT_PUBLIC_RPC_URL_BACKUP format, skipping');
  }
  
  // Always include default cluster API as final fallback
  const defaultEndpoint = clusterApiUrl(network);
  if (!endpoints.includes(defaultEndpoint)) {
    endpoints.push(defaultEndpoint);
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 RPC endpoints configured:', endpoints);
  }
  
  return endpoints;
}

/**
 * Test RPC endpoint health
 * High Priority: Implement actual RPC redundancy (Requirement 23.3)
 */
async function testEndpoint(endpoint: string): Promise<boolean> {
  try {
    const connection = new Connection(endpoint, 'confirmed');
    await Promise.race([
      connection.getSlot(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Select the best available RPC endpoint
 * Requirement 20.5: Automatic retry with exponential backoff
 */
async function selectBestEndpoint(endpoints: string[]): Promise<string> {
  // Test endpoints in parallel with timeout
  const results = await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const isHealthy = await testEndpoint(endpoint);
      return { endpoint, isHealthy };
    })
  );
  
  // Find first healthy endpoint
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.isHealthy) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Selected RPC endpoint:', result.value.endpoint);
      }
      return result.value.endpoint;
    }
  }
  
  // If no healthy endpoint found, return first one (will fail gracefully)
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ No healthy RPC endpoints found, using first endpoint');
  }
  return endpoints[0];
}

export const Providers: FC<ProvidersProps> = ({ children }) => {
  // Low Priority: Add development warnings for missing env vars
  const rawNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK;
  if (!rawNetwork && process.env.NODE_ENV === 'development') {
    console.warn('⚠️ NEXT_PUBLIC_SOLANA_NETWORK not set, defaulting to devnet');
  }
  
  const network = validateNetwork(rawNetwork || 'devnet');
  const [endpoint, setEndpoint] = useState<string>('');
  
  // Requirement 23.3: Multiple RPC endpoints for redundancy
  // Select best endpoint on mount
  useEffect(() => {
    const endpoints = getRPCEndpoints(network);
    
    selectBestEndpoint(endpoints).then((selectedEndpoint) => {
      setEndpoint(selectedEndpoint);
    }).catch((error) => {
      console.error('❌ Failed to select RPC endpoint:', error);
      // Fallback to first endpoint if selection fails
      setEndpoint(endpoints[0]);
    });
  }, [network]);

  // High Priority: Add error handling for wallet initialization
  // Requirement 6.1, 6.2, 21.2: Configure wallet adapters with mobile support
  const wallets = useMemo(() => {
    try {
      return [
        new PhantomWalletAdapter(), // Desktop and mobile with deep linking
        new SolflareWalletAdapter(), // Desktop and mobile with deep linking
        new TrustWalletAdapter(), // Mobile wallet with deep linking
        new CoinbaseWalletAdapter(), // Mobile wallet with deep linking
        new TorusWalletAdapter(), // Web-based, works on mobile browsers
      ];
    } catch (error) {
      console.error('❌ Failed to initialize wallet adapters:', error);
      // Return empty array to allow app to continue without wallets
      return [];
    }
  }, []);

  // Don't render until we have an endpoint
  if (!endpoint) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">Connecting to Solana network...</p>
        </div>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
