'use client';
import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Wallet state management hook
 * Requirement 6.3: Display wallet address and SOL balance
 * Requirement 6.5: Clear state on disconnect
 * Requirement 13.1: SOL balance monitoring for fee estimation
 */
export function useWalletState() {
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Fetch SOL balance when wallet connects
  useEffect(() => {
    if (!publicKey || !connected) {
      // Requirement 6.5: Clear state on disconnect
      setSolBalance(null);
      return;
    }

    let isMounted = true;
    setIsLoadingBalance(true);

    const fetchBalance = async () => {
      try {
        const balance = await connection.getBalance(publicKey);
        if (isMounted) {
          setSolBalance(balance / LAMPORTS_PER_SOL);
        }
      } catch (error) {
        console.error('Error fetching SOL balance:', error);
        if (isMounted) {
          setSolBalance(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingBalance(false);
        }
      }
    };

    fetchBalance();

    // Poll for balance updates every 30 seconds
    const intervalId = setInterval(fetchBalance, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [publicKey, connected, connection]);

  // Format wallet address for display
  const formattedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  // Format SOL balance with responsive precision
  const formattedBalance = solBalance !== null
    ? solBalance.toFixed(4)
    : null;

  // Check if user has sufficient SOL for transactions
  const hasSufficientSol = (requiredSol: number): boolean => {
    if (solBalance === null) return false;
    return solBalance >= requiredSol;
  };

  return {
    publicKey,
    connected,
    disconnect,
    solBalance,
    isLoadingBalance,
    formattedAddress,
    formattedBalance,
    hasSufficientSol,
  };
}
