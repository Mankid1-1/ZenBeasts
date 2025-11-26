## Objective
- Deliver a cohesive, trial-ready product with working on-chain mint + metadata, functional frontend actions, and test scaffolding that runs end-to-end locally.

## Changes To Implement
- Root build config: add `package.json` and `tsconfig.json` to support Anchor’s ts-mocha test execution (matching `Anchor.toml` scripts).
- Initialization script: add `scripts/initialize.ts` to set program config (cooldown, ZEN mint, treasury) for dev runs.
- Strengthen e2e tests: keep scaffolds, wire basic flows and ensure they compile with ts-mocha.

## Verification
- Populate envs and program IDs, run `anchor build && anchor test` (uses ts-mocha with the new root configs).
- Use `scripts/initialize.ts` to initialize config on devnet or local; then mint from frontend; perform activity and trait upgrades.

## Next Step
- Implement root configs and initializer script, then ensure tests and frontend build align with the program and IDL.