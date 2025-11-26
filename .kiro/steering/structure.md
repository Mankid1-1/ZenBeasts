---
inclusion: always
---

# Project Structure

## Root Organization

ZenBeasts is a monorepo with three main components:

```
/programs          - Anchor Solana program (Rust)
/frontend          - Next.js 14 web application
/api               - Express.js REST API
/scripts           - TypeScript utilities for deployment
/tests             - Integration tests
```

## Solana Program (`/programs/zenbeasts`)

```
src/
├── lib.rs                    - Program entry point, instruction definitions, events
├── errors.rs                 - Custom error types
├── instructions/             - Instruction handlers (one file per instruction)
│   ├── mod.rs
│   ├── initialize.rs
│   ├── create_beast.rs
│   ├── perform_activity.rs
│   ├── upgrade_trait.rs
│   ├── claim_rewards.rs
│   └── breed_beasts.rs
├── state/                    - Account structures (PDAs)
│   ├── mod.rs
│   ├── beast_account.rs      - Main NFT state account
│   └── program_config.rs     - Global config PDA
└── utils/                    - Helper functions
    ├── mod.rs
    └── traits.rs             - Trait generation and rarity calculation
```

### Key Patterns

- Each instruction has its own file in `instructions/`
- Account validation uses Anchor's `#[derive(Accounts)]` macro
- PDAs use consistent seed patterns: `[b"beast", mint.key()]` or `[b"config"]`
- All handlers return `Result<()>` and emit events
- State structs use `#[account]` and `#[derive(InitSpace)]`

## Frontend (`/frontend`)

```
src/
├── app/                      - Next.js 14 App Router
│   ├── layout.tsx            - Root layout with wallet provider
│   ├── page.tsx              - Main landing/game page
│   ├── providers.tsx         - Wallet adapter setup
│   └── api/health/           - Health check endpoint
├── components/               - React components
│   ├── beast/                - Beast-specific UI (cards, forms, panels)
│   └── wallet/               - Wallet connection components
├── hooks/                    - Custom React hooks for Solana interactions
│   ├── useProgram.ts         - Program instance and connection
│   ├── useBeast.ts           - Fetch beast account data
│   ├── useMintBeast.ts       - Mint instruction
│   ├── useActivity.ts        - Activity instruction
│   ├── useUpgrade.ts         - Upgrade instruction
│   ├── useClaim.ts           - Claim rewards instruction
│   └── useBreed.ts           - Breeding instruction
├── lib/
│   ├── anchor/               - Anchor setup and IDL
│   │   ├── setup.ts
│   │   └── idl.json          - Generated from Rust program
│   └── store/                - Zustand state management
│       └── beastStore.ts
└── types/
    └── beast.ts              - TypeScript interfaces
```

### Key Patterns

- One hook per program instruction (e.g., `useMintBeast`, `useActivity`)
- `useProgram` hook provides program instance to all other hooks
- Components are organized by feature (beast/, wallet/)
- All components use functional style with hooks
- Zustand for lightweight client state management

## API (`/api`)

```
src/
├── index.js                  - Express server entry point
└── idl.json                  - Copy of program IDL for caching
```

Simple REST API that serves the IDL and provides health checks. Uses ES modules (`"type": "module"`).

## Scripts (`/scripts`)

TypeScript utilities for common operations:
- `initialize.ts` - Initialize program config on-chain
- `mint-sample.ts` - Mint a sample beast
- `perform-activity.ts` - Test activity instruction

Run with: `npm run build && node dist/scripts/<script>.js`

## Tests (`/tests`)

Integration tests using Anchor's testing framework:
- `integration/zenbeasts.spec.ts` - Full instruction flow tests
- `integration/mint-and-activity.spec.ts` - Specific scenario tests

Run with: `anchor test` or `npm test`

## Configuration Files

- `Anchor.toml` - Anchor workspace config, program IDs, cluster settings
- `Cargo.toml` (root) - Rust workspace definition
- `package.json` (root) - TypeScript build and test scripts
- `tsconfig.json` - Shared TypeScript config
- `.env.example` - Template for environment variables

## Environment Variables

Required in `.env` (root and frontend):
- `NEXT_PUBLIC_PROGRAM_ID` - Deployed program address
- `NEXT_PUBLIC_ZEN_MINT` - ZEN token mint address
- `NEXT_PUBLIC_RPC_URL` - Solana RPC endpoint

## Build Artifacts

- `/target` - Rust compilation output (gitignored)
- `/dist` - TypeScript compilation output (gitignored)
- `frontend/.next` - Next.js build cache (gitignored)
- `frontend/src/lib/anchor/idl.json` - Generated from `anchor build`
