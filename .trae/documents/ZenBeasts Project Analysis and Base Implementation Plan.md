## Project Intent
- Build a Solana-native NFT gaming ecosystem where users mint unique "ZenBeasts", perform on-chain activities (meditation, yoga, brawl), upgrade traits by spending `$ZEN`, and evolve beasts over time.
- Emphasize true on-chain gameplay using PDAs for traits, rarity, cooldowns; Metaplex-compatible NFTs; sustainable, deflationary tokenomics; optional indexing/API and automation via bot hub.

## Goals
- Fast, low-cost interactions on Solana; mint and manage beasts with on-chain state.
- Sustainable economy: multiple token sinks, staking, future breeding and governance.
- Excellent UX: wallet connectivity (Phantom/Solflare), clean Next.js app, optional backend for sub-100ms reads.
- Operational automation via bot hub and observability (Prometheus/Grafana).

## Core Functionality
- Dynamic NFT minting with 10 trait layers and rarity calculation.
- Activity system with cooldowns and pending rewards, all on-chain.
- Trait upgrades funded by `$ZEN`, with burn/treasury split.
- Future features: staking, breeding, achievements, compressed NFTs, session keys.

## Current State (Key Artifacts)
- Vision and architecture documented in `README.md`, `ARCHITECTURE.md`, `EXECUTIVE_SUMMARY.md`, `TOKENOMICS.md`.
- Automation present: bot hub orchestrator and utilities (e.g., `bot-hub/orchestrator.py:30`).
- Infra scaffolding exists: `docker-compose.yml` for frontend, bot hub, api, redis, postgres, nginx, monitoring; robust Windows installer `install.ps1` for dev toolchain.
- Code gaps historically noted: Anchor programs, frontend app code, and optional backend API need to be implemented/verified.

## Compliance & UX Considerations
- Wallet connectivity with trusted providers increases user confidence; clear opt-in prompts, minimal data collection, and privacy policy for GDPR compliance.
- Tokenomics balanced for long-term stability and community trust (deflationary sinks, staking lock-ups, fair distribution).

## Implementation Plan
### 1. On-Chain Programs (Anchor/Rust)
- Create `Anchor.toml` and workspace `programs/zenbeasts`.
- Implement `initialize`, `create_beast`, `perform_activity`, `upgrade_trait`, `claim_rewards` with PDAs:
  - `ProgramConfig` holds global settings, `$ZEN` mint, treasury.
  - `BeastAccount` stores mint, owner, traits[10], rarity_score, cooldown state, pending_rewards.
- Utilities: trait generation and rarity calculation.
- Errors: cohesive error codes (owner checks, cooldown, invalid indices).
- Unit tests (Rust) and integration tests (TS) covering mint, activities, upgrades, and error paths.

### 2. Frontend (Next.js + Wallet Adapter)
- Scaffold Next.js app with wallet providers (Phantom/Solflare/Backpack) and health route.
- Hooks: `useProgram`, `useMintBeast`, `useBeast`, `useActivity`, `useUpgrade` aligned to program IDL and PDAs.
- Minimal UI: connect wallet, mint form, beast card with traits/rarity, activity panel (cooldown), upgrade panel using `$ZEN`.
- Configure `.env.local` for `NEXT_PUBLIC_PROGRAM_ID`, `NEXT_PUBLIC_ZEN_MINT`, and RPC endpoint; generate/consume IDL.

### 3. Backend API (Optional Indexer)
- Minimal Express API with endpoints:
  - `GET /health` for service status.
  - `GET /beast/:mint` reads PDA via Anchor or Helius DAS; Redis cache for fast responses.
  - `GET /metrics` for Prometheus scraping.
- env: RPC URL, program IDs, Redis/DB; integrate with `docker-compose.yml`.

### 4. Automation & Ops
- Keep bot hub orchestrator and utilities intact; configure program IDs and RPC for analytics bot.
- Monitoring via Prometheus/Grafana as defined in compose; Nginx for proxy if enabled.

### 5. CI & Tooling
- Extend GitHub Actions to build Anchor program, run tests (Rust/TS), and lint.
- Ensure `install.ps1` verifies toolchain and PATH health; add quick commands for devnet deployment.

## Verification
- On-chain: `anchor build && anchor test` and simulation checks.
- Frontend: run dev server; perform mint/activity/upgrade on devnet; validate cooldown and error handling.
- API: run local service; confirm health and `/beast/:mint` responses.
- Docker: `docker-compose up -d` core stack; verify health checks for `frontend`, `bot-hub`, `redis`, `postgres`.

## Deliverables
- Anchor program implementing Phase 1 features with tests and scripts.
- Next.js frontend with wallet integration and core user flows.
- Minimal Express API for health and fast reads.
- Updated CI and ready-to-run Docker stack.

## Next Step
- Upon approval, proceed to implement/verify all components end-to-end, wire environment variables, run devnet tests, and provide run instructions for local and Docker setups.