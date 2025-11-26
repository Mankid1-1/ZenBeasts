# Private Developer Test Launch Specification

## 1. Objective
To validate the ZenBeasts platform's core functionality, user experience, and developer ergonomics with a small group of trusted external developers before a public beta.

## 2. Scope
The test will focus on the **Devnet** environment.
**In Scope:**
-   **Onboarding**: Setting up the wallet and getting devnet SOL/ZEN.
-   **Core Loop**: Minting -> Activity -> Claiming -> Upgrading -> Breeding.
-   **UI/UX**: Responsiveness, error messages, and transaction feedback.
-   **Developer Experience**: Running the frontend locally (optional) or using the hosted devnet build.

**Out of Scope:**
-   Mainnet real-money transactions.
-   High-load stress testing (unless specified).
-   DAO governance features.

## 3. Target Audience
-   **Size**: 3-5 Developers.
-   **Profile**: Familiar with Solana/Web3, capable of providing technical feedback (console logs, reproduction steps).

## 4. Preparation Tasks
Before inviting testers, we must ensure:
1.  **Stable Devnet Deployment**: The program must be deployed and initialized on Devnet.
2.  **Hosted Frontend**: A Vercel/Netlify URL pointing to the Devnet program.
3.  **Tester Guide (`LAUNCH_README.md`)**: A simplified, step-by-step guide for testers.
    -   How to get Devnet SOL.
    -   How to get test ZEN tokens (faucet?).
    -   Walkthrough of the core loop.
4.  **Feedback Channel**: A dedicated Discord channel or GitHub Issues label (`beta-test`).

## 5. Test Scenarios
Testers will be asked to complete the following:
1.  **Connect Wallet**: Use Phantom/Solflare on Devnet.
2.  **Mint a Beast**: Verify metadata and image load.
3.  **Perform Activity**: Wait for cooldown, verify timer.
4.  **Claim Rewards**: Verify token balance updates.
5.  **Upgrade Trait**: Spend tokens to upgrade a trait.
6.  **Breed**: Breed two beasts (requires 2 mints + tokens).
7.  **Mobile Check**: Open the site on a mobile browser (via wallet app).

## 6. Success Criteria
-   [ ] All 5 testers successfully complete the "Breed" scenario.
-   [ ] No critical "white screen" crashes reported.
-   [ ] All reported "blocking" bugs are triaged and fixed.
-   [ ] Testers rate the UX > 4/5.

## 7. Timeline (Draft)
-   **Day 1**: Deploy stable Devnet build & freeze code.
-   **Day 2**: Distribute invites & `LAUNCH_README.md`.
-   **Day 3-5**: Testing window.
-   **Day 6**: Aggregate feedback & prioritize fixes.
