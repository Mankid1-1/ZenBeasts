# ZenBeasts Project Knowledge

## Overview
ZenBeasts is a Solana-based NFT and gaming project where users can mint, breed, and upgrade "Beasts". The project consists of a Solana Anchor smart contract (backend) and a Next.js frontend.

## Tech Stack
-   **Blockchain**: Solana
-   **Smart Contract Framework**: Anchor (Rust)
-   **Frontend Framework**: Next.js (React, TypeScript)
-   **Styling**: Tailwind CSS
-   **Deployment**: Vercel/Netlify (Frontend), Solana Devnet/Mainnet (Program)

## Architecture

### Smart Contract (Anchor)
-   **Program ID**: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS` (Devnet default)
-   **Location**: `programs/zenbeasts`

#### Data Models (State)
1.  **BeastAccount** (`state/beast_account.rs`)
    -   **Seeds**: `b"beast"`, `mint_pubkey`
    -   **Fields**:
        -   `mint`: Pubkey of the NFT.
        -   `owner`: Current owner Pubkey.
        -   `traits`: `[u8; 10]` representing visual/stat layers.
        -   `rarity_score`: `u64` aggregate score.
        -   `last_activity`: `i64` timestamp of last action.
        -   `activity_count`: `u32` total activities performed.
        -   `pending_rewards`: `u64` unclaimed ZEN tokens.
        -   `parents`: `[Pubkey; 2]` (Zero for Gen0).
        -   `generation`: `u8` (Gen0 = 0, Child = Max(Parents) + 1).
        -   `breeding_count`: `u8` times bred.

2.  **ProgramConfig** (`state/program_config.rs`)
    -   **Seeds**: `b"config"`
    -   **Fields**:
        -   `authority`: Admin Pubkey.
        -   `zen_mint`: Token mint for rewards/costs.
        -   `treasury`: Wallet receiving fees.
        -   `activity_cooldown`: Seconds between activities.
        -   `breeding_cooldown`: Seconds between breeding events.
        -   `reward_rate`: Tokens earned per second of activity.
        -   `burn_percentage`: % of fees burned (0-100).

#### Key Instructions (Logic)
1.  **`initialize`**
    -   Sets up `ProgramConfig`.
    -   Defines global constants (cooldowns, costs).

2.  **`create_beast`**
    -   Mints a new Gen0 Beast.
    -   Initializes `BeastAccount` with default stats.

3.  **`perform_activity`** (`instructions/perform_activity.rs`)
    -   **Checks**: Owner signature, Cooldown expiry.
    -   **Logic**:
        -   Calculates rewards: `(current_time - last_activity) * reward_rate`.
        -   Adds to `pending_rewards`.
        -   Updates `last_activity` to `current_time`.
    -   **Events**: `ActivityPerformed`.

4.  **`breed_beasts`** (`instructions/breed_beasts.rs`)
    -   **Checks**:
        -   Caller owns both parents.
        -   Parents are distinct.
        -   Breeding cooldowns expired.
        -   Sufficient ZEN balance.
    -   **Cost Logic**:
        -   Calculates cost based on generation.
        -   Burns `burn_percentage` of cost.
        -   Transfers remainder to `treasury`.
    -   **Genetics**:
        -   Mixes seeds with parent traits to generate child traits.
        -   Child Generation = `Max(ParentA.gen, ParentB.gen) + 1`.
    -   **Output**: Mints new NFT, creates `BeastAccount` for child.

5.  **`claim_rewards`**
    -   Transfers `pending_rewards` from vault to user.
    -   Resets `pending_rewards` to 0.

### Frontend (Next.js)
-   **Location**: `frontend/`
-   **Router**: App Router (`src/app`)

#### Key Components & Hooks
-   **Hooks** (`frontend/src/hooks`):
    -   `useProgram`: Initializes Anchor provider and program instance.
    -   `useBeasts`: Fetches user's beasts.
    -   `useActivity`: Handles `perform_activity` transactions.
    -   `useBreed`: Handles `breed_beasts` transactions.
    -   `useClaim`: Handles reward claiming.
-   **State**:
    -   Likely uses `useWalletState` for local tracking of user balances/status.

## Directory Structure
-   `programs/zenbeasts/src/`:
    -   `lib.rs`: Entry point.
    -   `state/`: Account definitions (`BeastAccount`, `ProgramConfig`).
    -   `instructions/`: Business logic modules.
    -   `errors.rs`: Custom `ZenBeastsError` enum.
    -   `utils/`: Helper functions (breeding math, cooldown checks).
-   `frontend/src/`:
    -   `app/`: Next.js pages.
    -   `components/`: UI components.
    -   `hooks/`: Blockchain interaction logic.
-   `scripts/`:
    -   `deploy-frontend.ps1`: Deployment automation.
    -   `initialize.js`: Post-deployment setup.
