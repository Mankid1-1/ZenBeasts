# ZenBeasts Frontend Installation Script
# Version: 1.0.0

#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Info { Write-ColorOutput Cyan $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Error { Write-ColorOutput Red $args }

Write-Info "╔════════════════════════════════════════════════════╗"
Write-Info "║      ZenBeasts Frontend Installation Setup         ║"
Write-Info "╚════════════════════════════════════════════════════╝"
Write-Host ""

# Check if Node.js is installed
Write-Info "Checking Node.js installation..."
try {
    $nodeVersion = node --version 2>&1
    $npmVersion = npm --version 2>&1
    Write-Success "✓ Node.js found: $nodeVersion"
    Write-Success "✓ npm found: $npmVersion"
} catch {
    Write-Error "✗ Node.js not found. Please run the main installer first."
    exit 1
}

# Navigate to frontend directory
$frontendDir = Join-Path $PSScriptRoot "..\frontend"
if (-not (Test-Path $frontendDir)) {
    Write-Info "Creating frontend directory..."
    New-Item -ItemType Directory -Path $frontendDir -Force | Out-Null
}

Push-Location $frontendDir

try {
    # Check if package.json exists
    if (-not (Test-Path "package.json")) {
        Write-Info "`nInitializing Next.js project..."

        $initProject = Read-Host "Initialize a new Next.js project? (Y/n)"
        if ($initProject -ne 'n' -and $initProject -ne 'N') {
            # Create Next.js app with TypeScript
            npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"

            if ($LASTEXITCODE -eq 0) {
                Write-Success "✓ Next.js project initialized"
            } else {
                Write-Warning "⚠ Project initialization had issues"
            }
        }
    } else {
        Write-Success "✓ package.json found"
    }

    # Install core Solana dependencies
    Write-Info "`nInstalling Solana Web3 dependencies..."

    $solanaDeps = @(
        "@solana/web3.js@latest",
        "@solana/wallet-adapter-base@latest",
        "@solana/wallet-adapter-react@latest",
        "@solana/wallet-adapter-react-ui@latest",
        "@solana/wallet-adapter-wallets@latest",
        "@solana/spl-token@latest",
        "@coral-xyz/anchor@0.29.0",
        "@metaplex-foundation/js@latest",
        "@metaplex-foundation/mpl-token-metadata@latest"
    )

    Write-Info "Installing packages: $($solanaDeps -join ', ')"
    npm install $solanaDeps

    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ Solana dependencies installed"
    } else {
        Write-Warning "⚠ Some dependencies may have failed to install"
    }

    # Install UI and utility dependencies
    Write-Info "`nInstalling UI and utility dependencies..."

    $uiDeps = @(
        "react-hot-toast@latest",
        "axios@latest",
        "swr@latest",
        "date-fns@latest",
        "clsx@latest",
        "tailwind-merge@latest",
        "framer-motion@latest",
        "zustand@latest"
    )

    npm install $uiDeps

    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ UI dependencies installed"
    } else {
        Write-Warning "⚠ Some UI dependencies may have failed to install"
    }

    # Install dev dependencies
    Write-Info "`nInstalling development dependencies..."

    $devDeps = @(
        "@types/node@latest",
        "@types/react@latest",
        "@types/react-dom@latest",
        "eslint@latest",
        "eslint-config-next@latest",
        "typescript@latest",
        "autoprefixer@latest",
        "postcss@latest",
        "tailwindcss@latest"
    )

    npm install --save-dev $devDeps

    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ Development dependencies installed"
    } else {
        Write-Warning "⚠ Some dev dependencies may have failed to install"
    }

    # Create .env.local template if it doesn't exist
    if (-not (Test-Path ".env.template")) {
        Write-Info "`nCreating .env template..."
        $envTemplate = @"
# ZenBeasts Frontend Configuration
# Copy this file to .env.local and configure

# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com

# Program IDs (update after deployment)
NEXT_PUBLIC_NFT_FACTORY_PROGRAM_ID=
NEXT_PUBLIC_ACTIVITIES_PROGRAM_ID=
NEXT_PUBLIC_ECONOMY_PROGRAM_ID=

# Helius API (for DAS/cNFT support)
NEXT_PUBLIC_HELIUS_API_KEY=

# Metaplex
NEXT_PUBLIC_METAPLEX_METADATA_PROGRAM_ID=metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s

# Analytics (optional)
NEXT_PUBLIC_GA_TRACKING_ID=
NEXT_PUBLIC_MIXPANEL_TOKEN=

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# Feature Flags
NEXT_PUBLIC_ENABLE_COMPRESSED_NFTS=false
NEXT_PUBLIC_ENABLE_STAKING=false
NEXT_PUBLIC_ENABLE_BREEDING=false

# Environment
NEXT_PUBLIC_ENVIRONMENT=development

# Redis/Cache (if using API)
REDIS_URL=redis://localhost:6379

# Security
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=
"@
        Set-Content -Path ".env.template" -Value $envTemplate
        Write-Success "✓ .env.template created"
    }

    # Copy to .env.local if it doesn't exist
    if (-not (Test-Path ".env.local")) {
        Copy-Item ".env.template" ".env.local"
        Write-Success "✓ .env.local file created"
    }

    # Create basic directory structure
    Write-Info "`nCreating directory structure..."

    $directories = @(
        "src/components/wallet",
        "src/components/nft",
        "src/components/ui",
        "src/contexts",
        "src/hooks",
        "src/utils",
        "src/lib",
        "src/types",
        "src/config",
        "public/images",
        "public/assets"
    )

    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Info "  Created: $dir"
        }
    }
    Write-Success "✓ Directory structure created"

    # Create basic Solana config file
    if (-not (Test-Path "src/config/solana.ts")) {
        Write-Info "`nCreating Solana configuration file..."
        $solanaConfig = @"
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';

export const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as WalletAdapterNetwork;

export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || clusterApiUrl(NETWORK);

export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Program IDs
export const NFT_FACTORY_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_NFT_FACTORY_PROGRAM_ID || '11111111111111111111111111111111'
);

export const ACTIVITIES_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ACTIVITIES_PROGRAM_ID || '11111111111111111111111111111111'
);

export const ECONOMY_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ECONOMY_PROGRAM_ID || '11111111111111111111111111111111'
);

export const COMMITMENT = 'confirmed';

export const PREFLIGHT_COMMITMENT = 'processed';
"@
        Set-Content -Path "src/config/solana.ts" -Value $solanaConfig
        Write-Success "✓ Solana config created"
    }

    # Create wallet provider wrapper
    if (-not (Test-Path "src/components/wallet/WalletProvider.tsx")) {
        Write-Info "Creating WalletProvider component..."
        $walletProvider = @"
'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { RPC_ENDPOINT } from '@/config/solana';

require('@solana/wallet-adapter-react-ui/styles.css');

export function WalletContextProvider({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
"@
        Set-Content -Path "src/components/wallet/WalletProvider.tsx" -Value $walletProvider
        Write-Success "✓ WalletProvider component created"
    }

    # Create basic types file
    if (-not (Test-Path "src/types/index.ts")) {
        Write-Info "Creating types file..."
        $typesFile = @"
import { PublicKey } from '@solana/web3.js';

export interface Beast {
  mint: PublicKey;
  name: string;
  image: string;
  attributes: BeastAttribute[];
  level: number;
  experience: number;
  rarity: BeastRarity;
}

export interface BeastAttribute {
  trait_type: string;
  value: string | number;
}

export enum BeastRarity {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  Epic = 'Epic',
  Legendary = 'Legendary',
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  rewards: {
    experience: number;
    zen: number;
  };
}

export interface UserProfile {
  wallet: PublicKey;
  beasts: Beast[];
  zenBalance: number;
  level: number;
  achievements: string[];
}
"@
        Set-Content -Path "src/types/index.ts" -Value $typesFile
        Write-Success "✓ Types file created"
    }

    # Create basic utility functions
    if (-not (Test-Path "src/utils/solana.ts")) {
        Write-Info "Creating utility functions..."
        $utilsFile = @"
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

export const shortenAddress = (address: string, chars = 4): string => {
  return `"`${address.slice(0, chars)}...`${address.slice(-chars)}`";
};

export const formatNumber = (num: number, decimals = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatSOL = (lamports: number): string => {
  return formatNumber(lamports / 1e9, 4);
};

export const sendTransaction = async (
  connection: Connection,
  wallet: WalletContextState,
  transaction: Transaction
): Promise<string> => {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.feePayer = wallet.publicKey;

  const signed = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());

  await connection.confirmTransaction(signature, 'confirmed');

  return signature;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
"@
        Set-Content -Path "src/utils/solana.ts" -Value $utilsFile
        Write-Success "✓ Utility functions created"
    }

    # Update or create tsconfig.json
    if (-not (Test-Path "tsconfig.json")) {
        Write-Info "Creating TypeScript configuration..."
        $tsConfig = @"
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
"@
        Set-Content -Path "tsconfig.json" -Value $tsConfig
        Write-Success "✓ TypeScript config created"
    }

    # Create README for frontend
    if (-not (Test-Path "README.md")) {
        Write-Info "Creating Frontend README..."
        $readme = @"
# ZenBeasts Frontend

Next.js frontend application for ZenBeasts NFT game on Solana.

## Quick Start

1. **Install dependencies:**
   ``````bash
   npm install
   ``````

2. **Configure environment:**
   Copy `.env.template` to `.env.local` and configure:
   ``````bash
   cp .env.template .env.local
   ``````
   Edit `.env.local` with your configuration.

3. **Run development server:**
   ``````bash
   npm run dev
   ``````
   Open [http://localhost:3000](http://localhost:3000)

4. **Build for production:**
   ``````bash
   npm run build
   npm start
   ``````

## Features

- 🔐 Solana wallet integration (Phantom, Solflare)
- 🎨 NFT minting and management
- 🎮 Beast activities and gameplay
- 💰 ZEN token integration
- 📊 User profile and statistics
- 🎯 Quest and achievement system

## Tech Stack

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Blockchain:** Solana Web3.js, Anchor
- **Wallet:** Solana Wallet Adapter
- **State:** Zustand
- **Data Fetching:** SWR
- **Animations:** Framer Motion

## Project Structure

``````
frontend/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   ├── wallet/      # Wallet integration
│   │   ├── nft/         # NFT display components
│   │   └── ui/          # Reusable UI components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Third-party integrations
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript types
│   └── config/           # Configuration files
├── public/               # Static assets
└── styles/               # Global styles
``````

## Key Components

- **WalletProvider**: Solana wallet connection wrapper
- **NFTCard**: Display individual Beast NFTs
- **ActivityPanel**: Beast activity interface
- **StakingInterface**: Token staking UI
- **MarketplaceGrid**: NFT marketplace display

## Environment Variables

Required variables in `.env.local`:

- `NEXT_PUBLIC_SOLANA_NETWORK`: Solana network (devnet/mainnet-beta)
- `NEXT_PUBLIC_SOLANA_RPC_HOST`: RPC endpoint URL
- `NEXT_PUBLIC_NFT_FACTORY_PROGRAM_ID`: NFT program ID
- `NEXT_PUBLIC_HELIUS_API_KEY`: Helius API key (for cNFTs)

## Development

### Adding a New Component

``````bash
# Create component file
touch src/components/MyComponent.tsx
``````

### Adding a New Page

``````bash
# Create page in app directory
touch src/app/my-page/page.tsx
``````

### Using Solana Connection

``````typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

const { connection } = useConnection();
const { publicKey, signTransaction } = useWallet();
``````

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## Deployment

### Vercel (Recommended)

``````bash
npm install -g vercel
vercel
``````

### Docker

``````bash
docker build -t zenbeasts-frontend .
docker run -p 3000:3000 zenbeasts-frontend
``````

## Troubleshooting

### Wallet Connection Issues

- Ensure wallet extension is installed
- Check that you're on the correct network
- Clear browser cache and reload

### Build Errors

``````bash
# Clear Next.js cache
rm -rf .next
npm run build
``````

### RPC Errors

- Verify RPC endpoint in `.env.local`
- Check Solana network status
- Try alternative RPC provider

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Anchor Documentation](https://www.anchor-lang.com/)

## License

MIT
"@
        Set-Content -Path "README.md" -Value $readme
        Write-Success "✓ README.md created"
    }

    # Build the project to verify everything works
    Write-Host ""
    $buildNow = Read-Host "Would you like to build the project to verify installation? (y/N)"
    if ($buildNow -eq 'y' -or $buildNow -eq 'Y') {
        Write-Info "`nBuilding project..."
        npm run build

        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Build successful!"
        } else {
            Write-Warning "⚠ Build had issues. Check the output above."
        }
    }

    # Summary
    Write-Host ""
    Write-Success "════════════════════════════════════════════════════"
    Write-Success "      Frontend Installation Complete!"
    Write-Success "════════════════════════════════════════════════════"
    Write-Host ""

    Write-Info "Installation Summary:"
    Write-Info "  Framework: Next.js with TypeScript"
    Write-Info "  Location: $PWD"
    Write-Info "  Package Manager: npm"
    Write-Info "  Configuration: .env.local"
    Write-Host ""

    Write-Info "Installed Packages:"
    Write-Info "  ✓ Solana Web3.js & Wallet Adapter"
    Write-Info "  ✓ Anchor Framework"
    Write-Info "  ✓ Metaplex SDK"
    Write-Info "  ✓ UI Components & Utilities"
    Write-Info "  ✓ TypeScript & Development Tools"
    Write-Host ""

    Write-Info "Next Steps:"
    Write-Info "1. Configure .env.local with your settings"
    Write-Info "2. Update program IDs after deployment"
    Write-Info "3. Start development server: npm run dev"
    Write-Info "4. Open http://localhost:3000"
    Write-Host ""

    Write-Warning "⚠ IMPORTANT: Configure .env.local before starting the dev server!"
    Write-Host ""

    Write-Info "Useful Commands:"
    Write-Info "  npm run dev          - Start development server"
    Write-Info "  npm run build        - Build for production"
    Write-Info "  npm start            - Start production server"
    Write-Info "  npm run lint         - Run linter"
    Write-Host ""

    Write-Success "Happy coding! 🚀"
    Write-Host ""

} catch {
    Write-Error "Installation failed: $_"
    exit 1
} finally {
    Pop-Location
}
