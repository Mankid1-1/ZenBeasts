## Understanding
- Intent: Build a Solana-native NFT gaming ecosystem where users mint unique "ZenBeasts", perform on-chain activities, upgrade traits by spending `$ZEN`, and participate in a sustainable economy with staking, breeding, and marketplace integration.
- Goals: True on-chain gameplay (traits, rarity, cooldowns stored in PDAs), deflationary tokenomics, great UX via a modern web app, optional backend indexing for fast reads, and bots to automate growth and operations.
- Core features: Dynamic minting, activity system, trait upgrades (burn `$ZEN`), staking/rewards, future breeding/governance/compressed NFTs.

## Current State
- Documentation is extensive and clear: `README.md` (project overview), `ARCHITECTURE.md` (program structure), `EXECUTIVE_SUMMARY.md` (strategy), `TOKENOMICS.md` (economy), `CLIENT_INTEGRATION.md` (frontend hooks).
- Automation exists: bot hub orchestrator and utilities are implemented (`bot-hub/orchestrator.py:30`, `bot-hub/bot_base.py:16`, `bot-hub/utils/db.py:18`, `bot-hub/utils/logger.py:18`).
- Infra scaffolding exists: root `docker-compose.yml` defines `frontend`, `bot-hub`, `api`, `redis`, `postgres`, `nginx`, `prometheus`, `grafana` services.
- Setup tooling: robust Windows installer (`install.ps1`) and setup scripts under `setup/`.
- Missing base code: No `programs/` (Anchor/Rust), no actual `frontend/` app source, no `api/` server implementation.

## Gaps
- On-chain program code and Anchor workspace are not present.
- Frontend Next.js app and Solana wallet integration are not present under `frontend/`.
- Optional backend API/indexer is not implemented under `api/`.
- Tests (Rust and TypeScript) and scripts are not present.

## Implementation Plan
### Phase 1 — On-chain Programs (Anchor/Rust)
- Create `Anchor.toml` and workspace `programs/zenbeasts/` with:
  - `src/lib.rs`: program entry with `initialize`, `create_beast`, `perform_activity`, `upgrade_trait`, `claim_rewards`.
  - `src/state/`: `beast_account.rs` and `program_config.rs` as in `ARCHITECTURE.md`.
  - `src/instructions/`: `initialize.rs`, `create_beast.rs`, `perform_activity.rs`, `upgrade_trait.rs` following the documented handlers.
  - `src/utils/traits.rs` and `src/errors.rs` as per examples.
  - `Cargo.toml` dependencies: `anchor-lang`, `anchor-spl`, `mpl-token-metadata`, `solana-program` versions aligned with `README.md`.
- Add `tests/` with TypeScript integration (`ts-mocha`) to cover minting, activity cooldown, trait upgrade, and error paths.
- Add `scripts/` for `mint-sample.ts`, `create-zen-token.ts`, `fund-treasury.ts`.

### Phase 2 — Frontend (Next.js + Wallet Adapter)
- Scaffold `frontend/` with Next.js 14 (App Router) and TypeScript.
- Add providers and wallet integration using Phantom/Solflare/Backpack per `CLIENT_INTEGRATION.md` (`src/app/providers.tsx`, `WalletButton.tsx`).
- Implement hooks: `useProgram`, `useMintBeast`, `useBeast`, `useActivity`, `useUpgrade` matching IDL and PDAs.
- Add minimal UI pages/components:
  - `MintPage` with name/URI input and mint action.
  - `BeastCard` + detail view showing traits/rarity.
  - `ActivityPanel` with cooldown feedback.
  - `UpgradePanel` for trait upgrades and `$ZEN` balance.
- Configure `.env.local` for `NEXT_PUBLIC_PROGRAM_ID`, `NEXT_PUBLIC_ZEN_MINT`, RPC endpoint.
- Include IDL generation step and consumption in `src/lib/anchor/idl.json`.

### Phase 3 — Backend API (Optional, for indexing/fast reads)
- Implement a minimal Node/Express server under `api/`:
  - `GET /health` and `GET /beast/:mint` returning on-chain state via Helius DAS (if configured) or Anchor client.
  - `GET /metrics` for Prometheus scraping.
  - Caching with Redis for sub-100ms responses.
- Environment: `DATABASE_URL`, `REDIS_URL`, program IDs, RPC URL; align with `docker-compose.yml` service `api`.

### Phase 4 — Bots & Operations
- Keep existing bot hub; add config stubs for Solana program ID and event subscriptions.
- Ensure orchestrator health checks and analytics tables are used (`bot-hub/orchestrator.py:170`, `_health_check_loop`).

### Phase 5 — Infrastructure & CI
- Align service env vars with the new program IDs and frontend/API endpoints.
- Extend `.github/workflows/ci.yml` to:
  - Build Anchor program, run Rust and TS tests on pushes.
  - Lint TypeScript/Rust.
- Ensure `docker-compose.yml` works with `frontend` and `api` builds after code is added.

### Phase 6 — Security & Compliance
- Apply wallet/key security: never log secrets; use `.env` for API keys.
- Basic GDPR considerations: clear consent (frontend modal), privacy policy link, data minimization for analytics.
- Runtime guards in Rust: checked arithmetic, signer and ownership validation, PDA seed verification.

## Verification
- Local: `anchor build && anchor test` for on-chain logic; run `npm run dev` in `frontend/` and verify mint/activity/upgrade flows on devnet.
- API: run `api` service, verify `/health` and `/beast/:mint` responses on devnet mint.
- Docker: `docker-compose up -d` core stack; confirm health checks for `frontend`, `bot-hub`, `redis`, `postgres`.

## Deliverables
- `programs/zenbeasts` Anchor program implementing Phase 1 features.
- `frontend/` Next.js app with wallet integration and core flows.
- `api/` minimal Express service with health and read endpoints.
- Tests: Rust unit and TS integration tests.
- Scripts for minting and token setup.

## Next Action
- After approval, I will scaffold the Anchor program, create the Next.js frontend and minimal API, wire envs, and run verification on devnet, then deliver the code and instructions to run locally and via Docker.