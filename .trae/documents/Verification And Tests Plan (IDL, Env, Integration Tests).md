## Objective
- Finalize base setup by adding IDL scaffolding, environment templates, and integration tests to validate mint/activity/upgrade flows, without running commands.

## Changes To Implement
- Add environment templates: root `.env.example`, `frontend/.env.template`, `api/.env.template` with required variables (RPC, program IDs, ZEN mint, keys placeholders).
- Add TypeScript test scaffold under `tests/integration/` using Anchor to connect and validate program readiness.
- Add simple scripts under `scripts/` for minting and performing activities to aid verification after deployment.

## Verification Strategy
- After you populate envs and install toolchain, run:
  - `anchor build && anchor test` for program
  - `npm run dev` in `frontend/` and test mint/activity/upgrade on devnet
  - start `api` and hit `/health` and `/beast/:mint`

## Next Step
- Proceed to implement the env templates, test scaffold, and helper scripts. After this, you can run local verification steps on your machine.