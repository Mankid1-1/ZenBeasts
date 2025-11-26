'use client';
import { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

/**
 * Wallet connection button with mobile-responsive design
 * Requirement 6.1: Display wallet connection options
 * Requirement 21.1: Mobile-responsive layout
 * Requirement 21.2: Mobile wallet support through deep linking
 */
export const WalletButton: FC = () => {
  const { publicKey, connected } = useWallet();
  
  return (
    <div className="flex items-center gap-3">
      {/* WalletMultiButton handles mobile deep linking automatically */}
      <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !px-4 !py-2 !text-sm md:!text-base" />
      
      {/* Requirement 6.3: Display wallet address when connected */}
      {connected && publicKey && (
        <div className="hidden sm:block text-xs md:text-sm text-gray-600 dark:text-gray-400 font-mono">
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </div>
      )}
    </div>
  );
};