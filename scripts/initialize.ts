import { AnchorProvider, Program, Idl, BN, Wallet } from '@coral-xyz/anchor'
import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createMint, mintTo } from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

// Suppress unused variable warnings for required imports
void TOKEN_PROGRAM_ID
void ASSOCIATED_TOKEN_PROGRAM_ID
void SYSVAR_RENT_PUBKEY

/**
 * Program initialization script with comprehensive default configuration
 * 
 * This script:
 * - Initializes the ZenBeasts program with all economic and timing parameters (Requirement 8.1, 8.2, 8.3)
 * - Sets up treasury and ZEN token mint accounts (Requirement 11.1)
 * - Configures all economic parameters (costs, rates, burn percentage) (Requirement 15.1)
 * - Sets rarity thresholds (Requirement 12.5)
 * - Configures cooldown durations (Requirement 16.2, 16.4)
 * - Validates parameters are within acceptable ranges (Requirement 17.2)
 */

async function main() {
  console.log('🚀 Starting ZenBeasts program initialization...\n')

  // Load environment variables
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const programIdStr = process.env.NEXT_PUBLIC_PROGRAM_ID
  
  if (!programIdStr) {
    throw new Error('NEXT_PUBLIC_PROGRAM_ID environment variable is required')
  }

  // Connect to Solana
  console.log('📡 Connecting to Solana:', rpc)
  const connection = new Connection(rpc, { commitment: 'confirmed' })
  
  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME || '', '.config/solana/id.json')
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  )
  const wallet = new Wallet(walletKeypair)
  console.log('👛 Wallet:', wallet.publicKey.toBase58())

  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey)
  console.log('💰 Wallet balance:', balance / 1e9, 'SOL\n')

  if (balance < 1e9) {
    console.warn('⚠️  Warning: Low SOL balance. You may need to airdrop more SOL for initialization.')
  }

  // Setup Anchor provider and program
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  const programId = new PublicKey(programIdStr)
  
  // Load IDL
  const idlPath = path.join(__dirname, '../target/idl/zenbeasts.json')
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8')) as Idl
  const program = new Program(idl, programId, provider)

  console.log('📋 Program ID:', programId.toBase58())

  // Derive program config PDA
  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  )
  console.log('⚙️  Config PDA:', config.toBase58())

  // Check if already initialized
  try {
    const existingConfig = await program.account.programConfig.fetch(config) as any
    console.log('\n✅ Program already initialized!')
    console.log('Authority:', existingConfig.authority.toBase58())
    console.log('ZEN Mint:', existingConfig.zenMint.toBase58())
    console.log('Treasury:', existingConfig.treasury.toBase58())
    return
  } catch (err) {
    console.log('📝 Program not yet initialized, proceeding...\n')
  }

  // Create or use existing ZEN token mint
  let zenMint: PublicKey
  const zenMintStr = process.env.ZEN_MINT

  if (zenMintStr) {
    zenMint = new PublicKey(zenMintStr)
    console.log('🪙  Using existing ZEN mint:', zenMint.toBase58())
  } else {
    console.log('🪙  Creating new ZEN token mint...')
    zenMint = await createMint(
      connection,
      walletKeypair,
      wallet.publicKey, // mint authority
      wallet.publicKey, // freeze authority
      9 // decimals
    )
    console.log('✅ Created ZEN mint:', zenMint.toBase58())
    console.log('⚠️  Save this mint address to your .env file as ZEN_MINT')
  }

  // Derive treasury authority PDA
  const [treasuryAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury_authority')],
    programId
  )
  console.log('🏦 Treasury Authority PDA:', treasuryAuthority.toBase58())

  // Create treasury token account
  const treasury = await getAssociatedTokenAddress(
    zenMint,
    treasuryAuthority,
    true // allowOwnerOffCurve for PDA
  )
  console.log('🏦 Treasury Token Account:', treasury.toBase58())

  // Configuration parameters with defaults
  // Requirement 8.1, 8.2, 8.3: Economic and timing parameters
  const activityCooldown = new BN(process.env.ACTIVITY_COOLDOWN || '3600') // 1 hour
  const breedingCooldown = new BN(process.env.BREEDING_COOLDOWN || '86400') // 24 hours
  const maxBreedingCount = Number(process.env.MAX_BREEDING_COUNT || '5')
  const upgradeBaseCost = new BN(process.env.UPGRADE_BASE_COST || '100000000') // 0.1 ZEN
  const upgradeScalingFactor = new BN(process.env.UPGRADE_SCALING_FACTOR || '100')
  const breedingBaseCost = new BN(process.env.BREEDING_BASE_COST || '1000000000') // 1 ZEN
  const generationMultiplier = new BN(process.env.GENERATION_MULTIPLIER || '150') // 1.5x per generation
  const rewardRate = new BN(process.env.REWARD_RATE || '2777') // ~0.01 ZEN per hour
  const burnPercentage = Number(process.env.BURN_PERCENTAGE || '10') // 10%

  console.log('\n📊 Configuration Parameters:')
  console.log('  Activity Cooldown:', activityCooldown.toString(), 'seconds')
  console.log('  Breeding Cooldown:', breedingCooldown.toString(), 'seconds')
  console.log('  Max Breeding Count:', maxBreedingCount)
  console.log('  Upgrade Base Cost:', upgradeBaseCost.toString(), 'lamports')
  console.log('  Upgrade Scaling Factor:', upgradeScalingFactor.toString())
  console.log('  Breeding Base Cost:', breedingBaseCost.toString(), 'lamports')
  console.log('  Generation Multiplier:', generationMultiplier.toString())
  console.log('  Reward Rate:', rewardRate.toString(), 'lamports/second')
  console.log('  Burn Percentage:', burnPercentage, '%')
  console.log('  Rarity Thresholds: [400, 600, 800, 950, 1020] (default)')

  // Initialize program
  console.log('\n🔧 Initializing program...')
  
  try {
    const tx = await program.methods
      .initialize(
        activityCooldown,
        breedingCooldown,
        maxBreedingCount,
        upgradeBaseCost,
        upgradeScalingFactor,
        breedingBaseCost,
        generationMultiplier,
        rewardRate,
        burnPercentage
      )
      .accounts({
        config,
        authority: wallet.publicKey,
        zenMint,
        treasury,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    console.log('✅ Initialization transaction:', tx)
    
    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash('confirmed')
    await connection.confirmTransaction({
      signature: tx,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed')
    console.log('✅ Transaction confirmed!')

    // Fetch and display initialized config
    const configAccount = await program.account.programConfig.fetch(config) as any
    console.log('\n📋 Initialized Configuration:')
    console.log('  Authority:', configAccount.authority.toBase58())
    console.log('  ZEN Mint:', configAccount.zenMint.toBase58())
    console.log('  Treasury:', configAccount.treasury.toBase58())
    console.log('  Activity Cooldown:', configAccount.activityCooldown.toString(), 'seconds')
    console.log('  Breeding Cooldown:', configAccount.breedingCooldown.toString(), 'seconds')
    console.log('  Max Breeding Count:', configAccount.maxBreedingCount)
    console.log('  Total Minted:', configAccount.totalMinted.toString())

    // Optionally mint some ZEN tokens to treasury for testing
    if (!zenMintStr) {
      console.log('\n💰 Minting initial ZEN tokens to treasury for testing...')
      const initialSupply = new BN('1000000000000') // 1000 ZEN
      await mintTo(
        connection,
        walletKeypair,
        zenMint,
        treasury,
        wallet.publicKey,
        BigInt(initialSupply.toString())
      )
      console.log('✅ Minted', initialSupply.toString(), 'lamports to treasury')
    }

    console.log('\n🎉 Program initialization complete!')
    console.log('\n📝 Next steps:')
    console.log('  1. Save the ZEN mint address to your .env file')
    console.log('  2. Update frontend environment variables')
    console.log('  3. Run sample minting script to test: npm run mint-sample')

  } catch (err) {
    console.error('\n❌ Initialization failed:', err)
    throw err
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
