'use client';
import { FC } from 'react';
import { useWalletState } from '@/hooks/useWalletState';

/**
 * Wallet information display component
 * Requirement 6.3: Display wallet address and SOL balance
 * Requirement 21.1: Mobile-responsive layout
 */
export const WalletInfo: FC = () => {
  const { 
    connected, 
    formattedAddress, 
    formattedBalance, 
    isLoadingBalance 
  } = useWalletState();

  if (!connected) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {/* Wallet Address */}
      <div className="flex items-center gap-2">
        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Address:
        </span>
        <span className="text-sm sm:text-base font-mono font-semibold text-gray-900 dark:text-gray-100">
          {formattedAddress}
        </span>
      </div>

      {/* SOL Balance */}
      <div className="flex items-center gap-2">
        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Balance:
        </span>
        {isLoadingBalance ? (
          <span className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Loading...
          </span>
        ) : (
          <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
            {formattedBalance} SOL
          </span>
        )}
      </div>
    </div>
  );
};
