import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// Configuration
const RPC_ENDPOINT = "https://api.devnet.solana.com";
const AIRDROP_AMOUNT = 2 * LAMPORTS_PER_SOL;

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log("Usage: ts-node scripts/setup-tester-wallet.ts <WALLET_ADDRESS>");
        return;
    }

    const walletAddress = new PublicKey(args[0]);
    const connection = new Connection(RPC_ENDPOINT, "confirmed");

    console.log(`Preparing wallet: ${walletAddress.toBase58()}`);
    console.log(`Network: Devnet`);

    // 1. Airdrop SOL
    try {
        console.log("Requesting SOL airdrop...");
        const signature = await connection.requestAirdrop(walletAddress, AIRDROP_AMOUNT);
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        });
        console.log(`✅ Airdropped ${AIRDROP_AMOUNT / LAMPORTS_PER_SOL} SOL`);
    } catch (error) {
        console.error("❌ Airdrop failed (might be rate limited). Please use faucet.solana.com manually.");
    }

    // 2. Check Balance
    const balance = await connection.getBalance(walletAddress);
    console.log(`Current Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    console.log("\nNext Steps:");
    console.log("1. Connect this wallet to the ZenBeasts frontend.");
    console.log("2. Mint a Beast to start playing!");
}

main().catch(console.error);
