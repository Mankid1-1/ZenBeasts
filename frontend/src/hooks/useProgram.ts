import { useMemo, useState, useEffect } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from '../lib/anchor/idl.json';
import { withRetry } from '../lib/connection';

/**
 * Hook for managing Anchor program instance with retry logic and loading states
 * 
 * Features:
 * - Multiple RPC endpoint support with automatic failover (Requirement 23.3)
 * - Automatic retry with exponential backoff (Requirement 20.5)
 * - Loading state management for skeleton display (Requirement 20.1)
 * - Connection health monitoring
 * 
 * @returns {Object} Program instance, connection, loading state, and error state
 */
export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize program instance with wallet and connection
  const program = useMemo(() => {
    if (!wallet) {
      setLoading(false);
      return null;
    }

    try {
      const provider = new AnchorProvider(connection, wallet, { 
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
        skipPreflight: false
      });
      const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
      const programInstance = new Program(idl as Idl, programId, provider);
      setLoading(false);
      setError(null);
      return programInstance;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize program'));
      setLoading(false);
      return null;
    }
  }, [connection, wallet]);

  // Monitor connection health on mount and periodically
  useEffect(() => {
    if (!connection) return;

    let mounted = true;
    let healthCheckInterval: NodeJS.Timeout;

    const checkConnection = async () => {
      try {
        // Verify connection is working by fetching slot with retry
        await withRetry(async () => {
          await connection.getSlot();
        });
        
        if (mounted) {
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Connection check failed'));
        }
      }
    };

    // Initial health check
    checkConnection();

    // Periodic health check every 30 seconds
    healthCheckInterval = setInterval(checkConnection, 30000);

    return () => {
      mounted = false;
      clearInterval(healthCheckInterval);
    };
  }, [connection]);

  return { 
    program, 
    connection, 
    loading, 
    error,
    isReady: !loading && !error && program !== null
  };
}

/**
 * Execute a program method with automatic retry logic
 * Wraps program method calls with exponential backoff retry
 * 
 * @param fn - Async function that calls a program method
 * @returns Promise with the transaction signature
 * 
 * Example usage:
 * ```typescript
 * const signature = await executeProgramMethod(async () => {
 *   return await program.methods.performActivity()
 *     .accounts({ ... })
 *     .rpc();
 * });
 * ```
 */
export async function executeProgramMethod<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn);
}