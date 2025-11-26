# ZenBeasts Deployment Guide

Complete guide for deploying ZenBeasts to Solana devnet and mainnet.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Program Deployment](#program-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [API Deployment](#api-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Backup and Recovery](#backup-and-recovery)

---

## Prerequisites

### Required Tools

```bash
# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
solana --version  # Should be v1.17+

# Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.29.0
avm use 0.29.0
anchor --version  # Should be 0.29.0

# Node.js and npm
node --version  # Should be v18+
npm --version   # Should be v9+

# Rust
rustup --version
rustc --version  # Should be 1.75+
```

### Wallet Setup

```bash
# Generate deployment wallet (or use existing)
solana-keygen new --outfile ~/.config/solana/deployer.json

# Get wallet address
solana-keygen pubkey ~/.config/solana/deployer.json

# Fund wallet
# Devnet: Use faucet
solana airdrop 2 --url devnet

# Mainnet: Transfer SOL from exchange
# Recommended: 5-10 SOL for deployment and operations
```

---

## Environment Configuration

### 1. Root .env File

```bash
# .env
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_URL_BACKUP=https://rpc.ankr.com/solana_devnet
SOLANA_RPC_URL_TERTIARY=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Program Configuration (will be set after deployment)
NEXT_PUBLIC_PROGRAM_ID=
NEXT_PUBLIC_ZEN_MINT=

# Treasury (will be set after initialization)
TREASURY_ADDRESS=

# API Keys
HELIUS_API_KEY=your_helius_api_key_here

# Monitoring
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_WEBHOOK
ALERT_EMAIL=alerts@yourdomain.com
```

### 2. Frontend .env

```bash
# frontend/.env.production
# Solana Network
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_RPC_URL_BACKUP=https://rpc.ankr.com/solana_devnet
NEXT_PUBLIC_RPC_URL_TERTIARY=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Program IDs (set after deployment)
NEXT_PUBLIC_PROGRAM_ID=
NEXT_PUBLIC_ZEN_MINT=

# API Endpoint
NEXT_PUBLIC_API_URL=https://api.zenbeasts.com

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 3. API .env

```bash
# api/.env
PORT=3001

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=

# CORS
CORS_ORIGIN=https://zenbeasts.com,https://www.zenbeasts.com

# Caching
REDIS_URL=redis://localhost:6379
CACHE_TTL=300

# Metadata Storage
ARWEAVE_WALLET_PATH=./arweave-wallet.json
IPFS_API_URL=https://ipfs.infura.io:5001
```

### 4. Anchor.toml Configuration

```toml
# Anchor.toml
[features]
seeds = false
skip-lint = false

[programs.devnet]
zenbeasts = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[programs.mainnet]
zenbeasts = "REPLACE_WITH_MAINNET_PROGRAM_ID"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/deployer.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"

[[test.validator.clone]]
address = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"

[[test.validator.clone]]
address = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
```

---

## Program Deployment

### Step 1: Build Program

```bash
# Clean previous builds
anchor clean

# Build program
anchor build

# Verify build
ls -lh target/deploy/zenbeasts.so
# Should see ~500KB file
```

### Step 2: Get Program ID

```bash
# Get program ID from keypair
solana-keygen pubkey target/deploy/zenbeasts-keypair.json

# Update Anchor.toml and lib.rs with this ID
```

### Step 3: Update Program ID in Code

```rust
// programs/zenbeasts/src/lib.rs
declare_id!("YOUR_PROGRAM_ID_HERE");
```

```toml
# Anchor.toml
[programs.devnet]
zenbeasts = "YOUR_PROGRAM_ID_HERE"
```

### Step 4: Rebuild with Correct ID

```bash
# Rebuild with updated program ID
anchor build

# Verify program ID matches
anchor keys list
```

### Step 5: Deploy to Devnet

```bash
# Set cluster to devnet
solana config set --url devnet

# Check wallet balance
solana balance
# Need at least 5 SOL for deployment

# Deploy program
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show YOUR_PROGRAM_ID
```

### Step 6: Initialize Program

```bash
# Build TypeScript
npm run build

# Run initialization script
node dist/scripts/initialize.js

# This will:
# - Create program config PDA
# - Create ZEN token mint
# - Create treasury token account
# - Set default parameters
```

### Step 7: Verify Initialization

```bash
# Check program config
solana account YOUR_CONFIG_PDA --output json

# Check ZEN mint
spl-token supply YOUR_ZEN_MINT

# Check treasury
spl-token balance --address YOUR_TREASURY_ADDRESS
```

### Step 8: Update Environment Variables

```bash
# Update .env files with deployed addresses
NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID
NEXT_PUBLIC_ZEN_MINT=YOUR_ZEN_MINT
TREASURY_ADDRESS=YOUR_TREASURY_ADDRESS
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

#### 1. Prepare for Deployment

```bash
cd frontend

# Install dependencies
npm install

# Build locally to test
npm run build

# Test production build
npm start
```

#### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Or use Vercel GitHub integration:
# 1. Push to GitHub
# 2. Import project in Vercel dashboard
# 3. Configure environment variables
# 4. Deploy
```

#### 3. Configure Environment Variables in Vercel

In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all variables from `frontend/.env.production`
3. Redeploy

#### 4. Configure Custom Domain

1. Go to Project Settings → Domains
2. Add your domain (e.g., zenbeasts.com)
3. Configure DNS records as instructed
4. Enable HTTPS (automatic with Vercel)

### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd frontend
netlify deploy --prod

# Configure environment variables in Netlify dashboard
```

### Option 3: Self-Hosted (Docker)

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t zenbeasts-frontend .
docker run -p 3000:3000 --env-file .env.production zenbeasts-frontend
```

---

## API Deployment

### Option 1: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd api
railway init

# Deploy
railway up

# Configure environment variables
railway variables set SOLANA_RPC_URL=https://api.devnet.solana.com
railway variables set PROGRAM_ID=YOUR_PROGRAM_ID
# ... set all other variables

# Get deployment URL
railway domain
```

### Option 2: Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
cd api
heroku create zenbeasts-api

# Set environment variables
heroku config:set SOLANA_RPC_URL=https://api.devnet.solana.com
heroku config:set PROGRAM_ID=YOUR_PROGRAM_ID
# ... set all other variables

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

### Option 3: Self-Hosted (Docker)

```dockerfile
# api/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]
```

```bash
# Build and run
docker build -t zenbeasts-api .
docker run -p 3001:3001 --env-file .env zenbeasts-api
```

### API Health Check

```bash
# Test API endpoint
curl https://api.zenbeasts.com/health

# Expected response:
# {"status":"ok","timestamp":1234567890}
```

---

## Post-Deployment Verification

### 1. Program Verification

```bash
# Check program is deployed
solana program show YOUR_PROGRAM_ID

# Verify program data
solana account YOUR_PROGRAM_ID --output json

# Check upgrade authority
solana program show YOUR_PROGRAM_ID | grep "Upgrade Authority"
```

### 2. Test Program Instructions

```bash
# Run test scripts
npm run build

# Test minting
node dist/scripts/mint-sample.js

# Test activity
node dist/scripts/perform-activity.js

# Test upgrade
node dist/scripts/upgrade-test.js

# Test breeding
node dist/scripts/breed-test.js
```

### 3. Frontend Verification

Visit your deployed frontend and test:

- [ ] Wallet connection works
- [ ] Beast minting works
- [ ] Beast collection displays
- [ ] Activity system works
- [ ] Reward claiming works
- [ ] Trait upgrades work
- [ ] Breeding works
- [ ] Mobile responsiveness
- [ ] Error handling

### 4. API Verification

```bash
# Test IDL endpoint
curl https://api.zenbeasts.com/idl

# Test health endpoint
curl https://api.zenbeasts.com/health

# Test metadata endpoint (if implemented)
curl https://api.zenbeasts.com/metadata/BEAST_MINT
```

### 5. Integration Testing

Run full integration test suite:

```bash
# Update test environment
export NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID
export NEXT_PUBLIC_ZEN_MINT=YOUR_ZEN_MINT

# Run tests
npm test
```

---

## Backup and Recovery

### 1. Program Backup

```bash
# Backup program binary
cp target/deploy/zenbeasts.so backups/zenbeasts-$(date +%Y%m%d).so

# Backup program keypair
cp target/deploy/zenbeasts-keypair.json backups/zenbeasts-keypair-$(date +%Y%m%d).json

# Store in secure location (encrypted cloud storage)
```

### 2. Wallet Backup

```bash
# Backup deployer wallet
cp ~/.config/solana/deployer.json backups/deployer-$(date +%Y%m%d).json

# Backup authority wallet
cp ~/.config/solana/authority.json backups/authority-$(date +%Y%m%d).json

# CRITICAL: Store recovery phrases offline
# - Write on paper
# - Store in fireproof safe
# - Keep multiple copies in secure locations
```

### 3. Configuration Backup

```bash
# Backup all configuration
tar -czf backups/config-$(date +%Y%m%d).tar.gz \
  .env \
  frontend/.env.production \
  api/.env \
  Anchor.toml

# Store securely
```

### 4. Database Backup (if using)

```bash
# PostgreSQL backup
pg_dump zenbeasts > backups/zenbeasts-db-$(date +%Y%m%d).sql

# Automated daily backups
echo "0 2 * * * pg_dump zenbeasts > /backups/zenbeasts-db-\$(date +\%Y\%m\%d).sql" | crontab -
```

### 5. Recovery Procedures

#### Program Recovery

```bash
# If program needs to be redeployed
anchor upgrade backups/zenbeasts-YYYYMMDD.so --program-id YOUR_PROGRAM_ID

# Verify recovery
solana program show YOUR_PROGRAM_ID
```

#### Wallet Recovery

```bash
# Restore from backup
cp backups/deployer-YYYYMMDD.json ~/.config/solana/deployer.json

# Or restore from recovery phrase
solana-keygen recover --outfile ~/.config/solana/deployer.json
# Enter recovery phrase when prompted
```

#### Configuration Recovery

```bash
# Restore configuration
tar -xzf backups/config-YYYYMMDD.tar.gz

# Verify all files restored
ls -la .env frontend/.env.production api/.env
```

---

## Mainnet Deployment

### Additional Considerations for Mainnet

1. **Security Audit**
   - Professional security audit required
   - Bug bounty program recommended
   - Extensive testing on devnet

2. **Economic Parameters**
   - Carefully calculated for sustainability
   - Conservative initial values
   - Gradual adjustments based on data

3. **Monitoring**
   - 24/7 monitoring setup
   - Automated alerting
   - Incident response plan

4. **Insurance**
   - Consider protocol insurance
   - Emergency fund for exploits
   - Legal entity and compliance

5. **Gradual Rollout**
   - Soft launch with limited users
   - Monitor for issues
   - Gradual scaling

### Mainnet Deployment Steps

```bash
# 1. Final testing on devnet
npm test

# 2. Security audit
# - Get professional audit
# - Fix all issues
# - Re-audit if necessary

# 3. Set cluster to mainnet
solana config set --url mainnet-beta

# 4. Fund mainnet wallet
# Transfer 10+ SOL for deployment and operations

# 5. Deploy program
anchor deploy --provider.cluster mainnet

# 6. Initialize program
node dist/scripts/initialize.js

# 7. Verify deployment
solana program show YOUR_MAINNET_PROGRAM_ID

# 8. Update frontend environment
# Update NEXT_PUBLIC_PROGRAM_ID to mainnet ID

# 9. Deploy frontend
vercel --prod

# 10. Deploy API
railway up

# 11. Announce launch
# - Social media
# - Discord/Telegram
# - Documentation

# 12. Monitor closely
# - Watch for issues
# - Be ready to respond
# - Collect user feedback
```

---

## Troubleshooting

### Deployment Fails

**Issue**: `Error: Account allocation failed: insufficient funds`

**Solution**:
```bash
# Check balance
solana balance

# Add more SOL
solana airdrop 2  # devnet
# or transfer from exchange (mainnet)
```

**Issue**: `Error: Program ID mismatch`

**Solution**:
```bash
# Ensure program ID matches in all locations:
# - Anchor.toml
# - lib.rs declare_id!()
# - Rebuild after changes
anchor build
```

### Frontend Build Fails

**Issue**: `Module not found` errors

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Not Responding

**Issue**: API returns 500 errors

**Solution**:
```bash
# Check logs
heroku logs --tail  # or railway logs

# Verify environment variables
heroku config  # or railway variables

# Test locally
npm run dev
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security audit completed (mainnet)
- [ ] Documentation updated
- [ ] Backup procedures in place
- [ ] Monitoring configured
- [ ] Wallets funded
- [ ] Environment variables set

### Deployment
- [ ] Program deployed
- [ ] Program initialized
- [ ] Frontend deployed
- [ ] API deployed
- [ ] Custom domain configured
- [ ] SSL certificates active

### Post-Deployment
- [ ] All instructions tested
- [ ] Frontend functionality verified
- [ ] API endpoints working
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Team notified
- [ ] Documentation published
- [ ] Community announced

---

## Support

For deployment issues:
- **Technical**: [GitHub Issues](https://github.com/zenbeasts/zenbeasts/issues)
- **Security**: security@zenbeasts.com
- **General**: support@zenbeasts.com

---

**Last Updated**: 2024
**Version**: 0.1.0