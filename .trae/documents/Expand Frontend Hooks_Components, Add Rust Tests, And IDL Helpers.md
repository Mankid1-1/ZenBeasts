## Objective
- Continue building the ecosystem base by adding functional frontend hooks and components for mint, activity, upgrade; add program PDA helpers; add basic Rust unit tests for trait utilities; and wire minimal types/store to support UI.

## Changes To Implement
- Frontend hooks: `useMintBeast`, `useBeast`, `useActivity`, `useUpgrade` using Anchor and PDAs.
- Frontend components: `MintForm`, `ActivityPanel`, `UpgradePanel` and integrate on the main page; wallet button already exists.
- Frontend helpers: program setup and PDA helpers in `lib/anchor/setup.ts`; basic beast store and types.
- Rust tests: add unit tests in trait utilities to verify trait generation and rarity calculation.

## Notes
- Keep code minimal and comment-free as requested.
- IDL remains a placeholder; after you run Anchor build, place the generated IDL in the frontend.

## Verification
- After envs and toolchain are set, run frontend dev server and test mint/activity/upgrade flows on devnet; run Rust tests for utils.

## Next Step
- Proceed to implement these code additions and integrate them into the existing skeleton.