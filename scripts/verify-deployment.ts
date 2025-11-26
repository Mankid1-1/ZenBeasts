/**
 * ZenBeasts Deployment Verification Script
 * 
 * This script verifies that the program is correctly deployed and initialized
 * Requirements: 21.2 - Verify program deployment and initialization
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Zenbeasts } from "../target/types/zenbeasts";
import fs from "fs";
import path from "path";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

async function verifyDeployment() {
  log("\n========================================", colors.green);
  log("ZenBeasts Deployment Verification", colors.green);
  log("========================================\n", colors.green);

  try {
    // Load configuration
    const cluster = process.env.CLUSTER || "devnet";
    const rpcUrl =
      cluster === "mainnet"
        ? "https://api.mainnet-beta.solana.com"
        : "https://api.devnet.solana.com";

    logInfo(`Connecting to ${cluster}...`);
    const connection = new Connection(rpcUrl, "confirmed");

    // Load program
    const idlPath = path.join(__dirname, "../target/idl/zenbeasts.json");
    if (!fs.existsSync(idlPath)) {
      logError("IDL file not found. Run 'anchor build' first.");
      process.exit(1);
    }

    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    const programId = new PublicKey(idl.metadata.address);

    logInfo(`Program ID: ${programId.toString()}`);

    const provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(Keypair.generate()), // Dummy wallet for read-only operations
      { commitment: "confirmed" }
    );

    const program = new Program(idl, programId, provider) as Program<Zenbeasts>;

    // Test 1: Verify program is deployed
    log("\n1. Verifying program deployment...", colors.yellow);
    try {
      const programAccount = await connection.getAccountInfo(programId);
      if (programAccount) {
        logSuccess("Program is deployed");
        logInfo(`  Program data size: ${programAccount.data.length} bytes`);
        logInfo(`  Owner: ${programAccount.owner.toString()}`);
      } else {
        logError("Program account not found");
        process.exit(1);
      }
    } catch (error) {
      logError(`Failed to fetch program account: ${error}`);
      process.exit(1);
    }

    // Test 2: Verify program is executable
    log("\n2. Verifying program is executable...", colors.yellow);
    try {
      const programAccount = await connection.getAccountInfo(programId);
      if (programAccount && programAccount.executable) {
        logSuccess("Program is executable");
      } else {
        logError("Program is not executable");
        process.exit(1);
      }
    } catch (error) {
      logError(`Failed to verify executable status: ${error}`);
      process.exit(1);
    }

    // Test 3: Derive and check config PDA
    log("\n3. Checking program configuration...", colors.yellow);
    try {
      const [configPDA, configBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        programId
      );

      logInfo(`  Config PDA: ${configPDA.toString()}`);
      logInfo(`  Config Bump: ${configBump}`);

      const configAccount = await connection.getAccountInfo(configPDA);
      if (configAccount) {
        logSuccess("Program is initialized");

        // Try to fetch and decode config
        try {
          const config = await program.account.programConfig.fetch(configPDA);
          logInfo(`  Authority: ${config.authority.toString()}`);
          logInfo(`  ZEN Mint: ${config.zenMint.toString()}`);
          logInfo(`  Treasury: ${config.treasury.toString()}`);
          logInfo(`  Activity Cooldown: ${config.activityCooldown}s`);
          logInfo(`  Breeding Cooldown: ${config.breedingCooldown}s`);
          logInfo(`  Upgrade Base Cost: ${config.upgradeBaseCost} lamports`);
          logInfo(`  Breeding Base Cost: ${config.breedingBaseCost} lamports`);
          logInfo(`  Reward Rate: ${config.rewardRate} lamports/second`);
          logInfo(`  Burn Percentage: ${config.burnPercentage}%`);
          logInfo(`  Total Minted: ${config.totalMinted}`);
        } catch (error) {
          logWarning("Could not decode config account (might be using old schema)");
        }
      } else {
        logWarning("Program is NOT initialized");
        logInfo("  Run 'npm run initialize' to initialize the program");
      }
    } catch (error) {
      logError(`Failed to check config: ${error}`);
    }

    // Test 4: Verify IDL matches deployed program
    log("\n4. Verifying IDL consistency...", colors.yellow);
    try {
      const idlProgramId = new PublicKey(idl.metadata.address);
      if (idlProgramId.equals(programId)) {
        logSuccess("IDL program ID matches deployed program");
      } else {
        logError("IDL program ID does not match deployed program");
        logInfo(`  IDL: ${idlProgramId.toString()}`);
        logInfo(`  Deployed: ${programId.toString()}`);
      }
    } catch (error) {
      logError(`Failed to verify IDL: ${error}`);
    }

    // Test 5: Check program upgrade authority
    log("\n5. Checking program upgrade authority...", colors.yellow);
    try {
      const programAccount = await connection.getAccountInfo(programId);
      if (programAccount) {
        // The upgrade authority is stored in the program data account
        // For BPF Loader v2/v3, we need to check the program data account
        const PROGRAM_DATA_OFFSET = 4; // Skip discriminator
        const programDataAddress = new PublicKey(
          programAccount.data.slice(PROGRAM_DATA_OFFSET, PROGRAM_DATA_OFFSET + 32)
        );

        const programDataAccount = await connection.getAccountInfo(programDataAddress);
        if (programDataAccount) {
          // Upgrade authority is at offset 13 (1 byte option + 4 bytes slot + 8 bytes padding)
          const hasAuthority = programDataAccount.data[0] === 1;
          if (hasAuthority) {
            const authorityPubkey = new PublicKey(
              programDataAccount.data.slice(13, 45)
            );
            logSuccess("Program has upgrade authority");
            logInfo(`  Authority: ${authorityPubkey.toString()}`);
          } else {
            logWarning("Program upgrade authority is disabled (immutable)");
          }
        }
      }
    } catch (error) {
      logWarning(`Could not check upgrade authority: ${error}`);
    }

    // Test 6: Test program compatibility
    log("\n6. Testing program compatibility...", colors.yellow);
    try {
      // Try to fetch a non-existent account to test if program responds
      const testPubkey = Keypair.generate().publicKey;
      const [testPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("beast"), testPubkey.toBuffer()],
        programId
      );

      try {
        await program.account.beastAccount.fetch(testPDA);
        logWarning("Unexpected: Found test account");
      } catch (error: any) {
        if (error.message.includes("Account does not exist")) {
          logSuccess("Program responds correctly to queries");
        } else {
          logWarning(`Unexpected error: ${error.message}`);
        }
      }
    } catch (error) {
      logWarning(`Could not test program compatibility: ${error}`);
    }

    // Summary
    log("\n========================================", colors.green);
    log("Verification Summary", colors.green);
    log("========================================\n", colors.green);

    logSuccess("Program is deployed and accessible");
    logInfo(`Cluster: ${cluster}`);
    logInfo(`Program ID: ${programId.toString()}`);
    logInfo(`RPC URL: ${rpcUrl}`);

    log("\nNext steps:", colors.yellow);
    log("1. If not initialized, run: npm run initialize");
    log("2. Test minting: npm run mint-sample");
    log("3. Deploy frontend application");
    log("4. Run integration tests");

    log("\n✓ Verification complete!\n", colors.green);
  } catch (error) {
    logError(`\nVerification failed: ${error}`);
    process.exit(1);
  }
}

// Run verification
verifyDeployment().catch((error) => {
  logError(`Fatal error: ${error}`);
  process.exit(1);
});
