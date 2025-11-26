# ZenBeasts Development Guidelines

## Steering Rules
This document serves as a guide for AI agents and developers working on the ZenBeasts project.

### 1. Codebase Navigation
-   **Backend**: All smart contract logic is in `programs/zenbeasts`.
    -   **State**: definitions in `src/state`. Always update `InitSpace` when modifying structs.
    -   **Instructions**: Logic in `src/instructions`. One file per instruction.
    -   **Errors**: All errors must be defined in `src/errors.rs`.
-   **Frontend**: All UI code is in `frontend/src`.
    -   **Hooks**: Encapsulate all Anchor interactions in `src/hooks`. Do not call program methods directly in components.
    -   **UI**: Use Tailwind CSS for all styling.

### 2. Coding Standards
-   **Rust/Anchor**:
    -   **Security**: Always use `#[account(mut)]` only when necessary. Verify ownership (`beast.owner == payer.key()`) in every instruction that modifies a beast.
    -   **Math**: Use `checked_add`, `checked_mul`, etc., for all arithmetic to prevent overflows. Handle `Option` results with proper errors (`ArithmeticOverflow`).
    -   **Time**: Use `Clock::get()?.unix_timestamp` for all time-based logic.
    -   **Seeds**: Use constants for seeds (e.g., `BeastAccount::SEED_PREFIX`).
-   **TypeScript/Next.js**:
    -   **Types**: Define interfaces for all on-chain accounts in `src/types`.
    -   **Error Handling**: Wrap all transaction calls in `try/catch` and display user-friendly error messages (parsing the Anchor error logs).
    -   **Performance**: Use `useCallback` and `useMemo` for expensive calculations or stable function references in hooks.

### 3. Testing & Verification
-   **Smart Contracts**:
    -   Run `anchor test` to execute the suite.
    -   Ensure new instructions have a corresponding test case in `tests/`.
-   **Frontend**:
    -   Test flows (Mint -> Activity -> Breed) on Devnet before Mainnet.
    -   Verify UI updates immediately after transaction confirmation (optimistic updates or re-fetch).

### 4. Deployment
-   **Devnet**: `npm run deploy:devnet`.
-   **Mainnet**: `npm run deploy:mainnet` (Requires multisig/admin approval).
-   **Frontend**: `npm run deploy:frontend:preview` for staging.

### 5. Documentation
-   **Architecture**: Keep `PROJECT_KNOWLEDGE.md` updated if data models change.
-   **Status**: Update `IMPLEMENTATION_STATUS.md` after every major feature completion.
-   **Tasks**: Maintain `task.md` as the source of truth for current work.

## Key Commands
-   `npm run build:program`: Build Anchor program.
-   `npm run build:frontend`: Build Next.js app.
-   `npm test`: Run project tests.
