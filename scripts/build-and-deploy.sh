#!/bin/bash

# ZenBeasts Build and Deploy Script
# This script builds the Anchor program with optimizations and deploys to the specified cluster

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLUSTER=${1:-devnet}  # Default to devnet if not specified
PROGRAM_NAME="zenbeasts"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}ZenBeasts Build and Deploy Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Target Cluster: ${YELLOW}${CLUSTER}${NC}"
echo ""

# Verify prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo -e "${RED}Error: Solana CLI not found${NC}"
    echo "Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi
echo -e "${GREEN}✓ Solana CLI found: $(solana --version)${NC}"

# Check Anchor CLI
if ! command -v anchor &> /dev/null; then
    echo -e "${RED}Error: Anchor CLI not found${NC}"
    echo "Install from: https://www.anchor-lang.com/docs/installation"
    exit 1
fi
echo -e "${GREEN}✓ Anchor CLI found: $(anchor --version)${NC}"

# Check Rust
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Error: Rust/Cargo not found${NC}"
    echo "Install from: https://rustup.rs/"
    exit 1
fi
echo -e "${GREEN}✓ Rust found: $(rustc --version)${NC}"

# Check bc (needed for balance calculations)
if ! command -v bc &> /dev/null; then
    echo -e "${RED}Error: bc not found${NC}"
    echo "Install with: apt-get install bc (Linux) or brew install bc (macOS)"
    exit 1
fi
echo -e "${GREEN}✓ bc found${NC}"

echo ""

# Configure Solana cluster
echo -e "${YELLOW}Configuring Solana cluster...${NC}"
if [ "$CLUSTER" = "mainnet" ]; then
    solana config set --url https://api.mainnet-beta.solana.com
elif [ "$CLUSTER" = "devnet" ]; then
    solana config set --url https://api.devnet.solana.com
elif [ "$CLUSTER" = "localnet" ]; then
    solana config set --url http://localhost:8899
else
    echo -e "${RED}Error: Invalid cluster specified. Use: devnet, mainnet, or localnet${NC}"
    exit 1
fi

# Display current configuration
echo -e "${GREEN}Current Solana configuration:${NC}"
solana config get
echo ""

# Check wallet balance
WALLET_ADDRESS=$(solana address)
BALANCE=$(solana balance --lamports)
BALANCE_SOL=$(echo "scale=4; $BALANCE / 1000000000" | bc)

echo -e "${YELLOW}Wallet Information:${NC}"
echo -e "Address: ${GREEN}${WALLET_ADDRESS}${NC}"
echo -e "Balance: ${GREEN}${BALANCE_SOL} SOL${NC}"
echo ""

# Check if sufficient balance for deployment
MIN_BALANCE=5000000000  # 5 SOL minimum for devnet
if [ "$CLUSTER" = "mainnet" ]; then
    MIN_BALANCE=20000000000  # 20 SOL minimum for mainnet
fi

if [ "$BALANCE" -lt "$MIN_BALANCE" ]; then
    MIN_SOL=$(echo "scale=4; $MIN_BALANCE / 1000000000" | bc)
    echo -e "${RED}Warning: Insufficient balance for deployment${NC}"
    echo -e "Required: ${MIN_SOL} SOL, Current: ${BALANCE_SOL} SOL"
    
    if [ "$CLUSTER" = "devnet" ]; then
        echo ""
        echo -e "${YELLOW}Attempting to airdrop SOL...${NC}"
        solana airdrop 5 || echo -e "${RED}Airdrop failed. Please fund your wallet manually.${NC}"
        
        # Check balance again
        BALANCE=$(solana balance --lamports)
        BALANCE_SOL=$(echo "scale=4; $BALANCE / 1000000000" | bc)
        echo -e "New balance: ${GREEN}${BALANCE_SOL} SOL${NC}"
    else
        echo -e "${RED}Please fund your wallet before deploying to ${CLUSTER}${NC}"
        exit 1
    fi
fi

echo ""

# Confirm deployment
if [ "$CLUSTER" = "mainnet" ]; then
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}WARNING: MAINNET DEPLOYMENT${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}This will deploy to MAINNET using REAL SOL!${NC}"
    echo -e "${RED}This action cannot be undone.${NC}"
    echo ""
    read -p "Are you absolutely sure you want to continue? (type 'YES' to confirm): " CONFIRM
    
    if [ "$CONFIRM" != "YES" ]; then
        echo -e "${YELLOW}Deployment cancelled.${NC}"
        exit 0
    fi
fi

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
anchor clean
echo -e "${GREEN}✓ Clean complete${NC}"
echo ""

# Build the program
echo -e "${YELLOW}Building program with optimizations...${NC}"
echo -e "${YELLOW}This may take several minutes...${NC}"

if [ "$CLUSTER" = "mainnet" ]; then
    # Build with verifiable flag for mainnet
    anchor build --verifiable
else
    anchor build
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Display build artifacts
echo -e "${YELLOW}Build artifacts:${NC}"
ls -lh target/deploy/${PROGRAM_NAME}.so
echo ""

# Get program ID from lib.rs (compatible with both GNU and BSD grep)
PROGRAM_ID=$(grep 'declare_id!' programs/${PROGRAM_NAME}/src/lib.rs | sed -n 's/.*declare_id!("\([^"]*\)".*/\1/p')

if [ -z "$PROGRAM_ID" ]; then
    echo -e "${RED}Error: Could not extract program ID from lib.rs${NC}"
    exit 1
fi

echo -e "Program ID: ${GREEN}${PROGRAM_ID}${NC}"
echo ""

# Deploy the program
echo -e "${YELLOW}Deploying program to ${CLUSTER}...${NC}"
echo -e "${YELLOW}This may take several minutes...${NC}"

anchor deploy --provider.cluster $CLUSTER

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Deployment complete${NC}"
echo ""

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
solana program show $PROGRAM_ID

if [ $? -ne 0 ]; then
    echo -e "${RED}Verification failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Verification complete${NC}"
echo ""

# Check if program needs initialization
echo -e "${YELLOW}Checking program initialization status...${NC}"
echo -e "${YELLOW}Note: Initialization check requires running the initialize script${NC}"
echo ""
echo -e "${YELLOW}To initialize the program, run:${NC}"
echo -e "${GREEN}npm run initialize${NC}"
echo ""
echo -e "Or manually with custom parameters:"
echo -e "${GREEN}ts-node scripts/initialize.ts \\${NC}"
echo -e "${GREEN}  --zen-mint <ZEN_TOKEN_MINT> \\${NC}"
echo -e "${GREEN}  --activity-cooldown 3600 \\${NC}"
echo -e "${GREEN}  --breeding-cooldown 86400 \\${NC}"
echo -e "${GREEN}  --upgrade-base-cost 1000000000 \\${NC}"
echo -e "${GREEN}  --breeding-base-cost 5000000000 \\${NC}"
echo -e "${GREEN}  --reward-rate 100000 \\${NC}"
echo -e "${GREEN}  --burn-percentage 10${NC}"

echo ""

# Update environment files
echo -e "${YELLOW}Updating environment files...${NC}"

# Cross-platform sed function
update_env_file() {
    local file=$1
    local pattern=$2
    local replacement=$3
    
    if [ -f "$file" ]; then
        # Create backup
        cp "$file" "${file}.bak"
        
        # Update file (works on both Linux and macOS)
        if grep -q "$pattern" "$file"; then
            # Pattern exists, replace it
            sed "s|${pattern}.*|${replacement}|" "${file}.bak" > "$file"
            echo -e "${GREEN}✓ Updated ${file}${NC}"
        else
            # Pattern doesn't exist, append it
            echo "$replacement" >> "$file"
            echo -e "${GREEN}✓ Added to ${file}${NC}"
        fi
        
        # Remove backup
        rm "${file}.bak"
    else
        echo -e "${YELLOW}⚠ ${file} not found, skipping${NC}"
    fi
}

# Update .env
update_env_file ".env" "NEXT_PUBLIC_PROGRAM_ID=" "NEXT_PUBLIC_PROGRAM_ID=${PROGRAM_ID}"

# Update frontend/.env
update_env_file "frontend/.env" "NEXT_PUBLIC_PROGRAM_ID=" "NEXT_PUBLIC_PROGRAM_ID=${PROGRAM_ID}"

echo ""

# Copy IDL to frontend
echo -e "${YELLOW}Copying IDL to frontend...${NC}"
mkdir -p frontend/src/lib/anchor

if [ -f "target/idl/${PROGRAM_NAME}.json" ]; then
    cp target/idl/${PROGRAM_NAME}.json frontend/src/lib/anchor/idl.json
    echo -e "${GREEN}✓ IDL copied to frontend${NC}"
else
    echo -e "${RED}Error: IDL file not found at target/idl/${PROGRAM_NAME}.json${NC}"
    exit 1
fi

# Copy IDL to api
echo -e "${YELLOW}Copying IDL to api...${NC}"
mkdir -p api/src

if [ -f "target/idl/${PROGRAM_NAME}.json" ]; then
    cp target/idl/${PROGRAM_NAME}.json api/src/idl.json
    echo -e "${GREEN}✓ IDL copied to api${NC}"
else
    echo -e "${YELLOW}⚠ Could not copy IDL to api${NC}"
fi

echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Cluster:    ${YELLOW}${CLUSTER}${NC}"
echo -e "Program ID: ${YELLOW}${PROGRAM_ID}${NC}"
echo -e "Wallet:     ${YELLOW}${WALLET_ADDRESS}${NC}"
echo -e "Balance:    ${YELLOW}$(solana balance)${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "1. Initialize the program (if not already done)"
echo -e "2. Update frontend environment variables"
echo -e "3. Deploy frontend application"
echo -e "4. Test the deployment"
echo ""
echo -e "${GREEN}Deployment complete! 🎉${NC}"
