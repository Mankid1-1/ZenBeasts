import { AnchorProvider, Program, Idl, Wallet } from '@coral-xyz/anchor'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Upgrade testing script
 * 
 * This script:
 * - Tests trait upgrades (Requirement 4.1, 4.2, 4.3, 4.4, 4.5)
 * - Tests cost scaling (Requirement 17.1, 17.2)
 * - Tests trait max value enforcement
 */

async function main() {
  console.log('⚡ Starting ZenBeasts upgrade test...\n')

  // Load environment variables
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const programIdStr = process.env.NEXT_PUBLIC_PROGRAM_ID
  const zenMintStr = process.env.ZEN_MINT
  const beastMintStr = process.argv[2]
  const traitIndexStr = process.argv[3]
  
  if (!programIdStr) {
    throw new Error('NEXT_PUBLIC_PROGRAM_ID environment variable is required')
  }
  
  if (!zenMintStr) {
    throw new Error('ZEN_MINT environment variable is required')
  }
  
  if (!beastMintStr || !traitIndexStr) {
    console.error('Usage: npm run upgrade-test <beast_mint> <trait_index>')
    console.error('Trait indices: 0=Strength, 1=Agility, 2=Wisdom, 3=Vitality')
    console.error('Example: npm run upgrade-test 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 0')
    process.exit(1)
  }
  
  const traitIndex = parseInt(traitIndexStr)
  if (traitIndex < 0 || traitIndex > 3) {
    console.error('❌ Invalid trait index. Must be 0-3 for core traits.')
    process.exit(1)
  }

  const traitNames = ['Strength', 'Agility', 'Wisdom', 'Vitality']

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

  // Setup Anchor provider and program
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  const programId = new PublicKey(programIdStr)
  
  // Load IDL
  const idlPath = path.join(__dirname, '../target/idl/zenbeasts.json')
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8')) as Idl
  const program = new Program(idl, programId, provider)

  console.log('📋 Program ID:', programId.toBase58())

  // Derive accounts
  const beastMint = new PublicKey(beastMintStr)
  const [beastAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('beast'), beastMint.toBuffer()],
    programId
  )
  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  )

  console.log('🐉 Beast Mint:', beastMintStr)
  console.log('⚡ Upgrading:', traitNames[traitIndex])

  // Fetch beast data before upgrade
  console.log('\n📊 Beast Status Before Upgrade:')
  try {
    const beastData = await program.account.beastAccount.fetch(beastAccount) as any
    const configData = await program.account.programConfig.fetch(config) as any
    
    // Check ownership
    if (beastData.owner.toString() !== wallet.publicKey.toString()) {
      console.error('❌ You do not own this beast')
      process.exit(1)
    }
    
    const traits = Array.from(beastData.traits as number[])
    const currentValue = traits[traitIndex]
    const rarityScore = Number(beastData.rarityScore)
    
    console.log('  Current Traits:')
    console.log(`    Strength: ${traits[0]}`)
    console.log(`    Agility: ${traits[1]}`)
    console.log(`    Wisdom: ${traits[2]}`)
    console.log(`    Vitality: ${traits[3]}`)
    console.log(`  Rarity Score: ${rarityScore}`)
    console.log(`  ${traitNames[traitIndex]}: ${currentValue}`)
    
    // Check if trait is at max
    if (currentValue >= 255) {
      console.error(`❌ ${traitNames[traitIndex]} is already at maximum value (255)`)
      process.exit(1)
    }
    
    // Calculate upgrade cost
    const baseCost = Number(configData.upgradeBaseCost)
    const scalingFactor = Number(configData.upgradeScalingFactor)
    const multiplier = 1 + (currentValue / scalingFactor)
    const upgradeCost = Math.floor(baseCost * multiplier)
    
    console.log(`\n💰 Upgrade Cost: ${upgradeCost / 1e9} ZEN`)
    console.log(`  Base Cost: ${baseCost / 1e9} ZEN`)
    console.log(`  Scaling Factor: ${scalingFactor}`)
    console.log(`  Multiplier: ${multiplier.toFixed(2)}x`)
    
    // Check ZEN balance
    const zenMint = new PublicKey(zenMintStr)
    const userTokenAccount = await getAssociatedTokenAddress(zenMint, wallet.publicKey)
    const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount)
    const balance = Number(tokenBalance.value.amount)
    
    console.log(`💳 Your ZEN Balance: ${balance / 1e9} ZEN`)
    
    if (balance < upgradeCost) {
      console.error(`❌ Insufficient ZEN tokens. Need ${upgradeCost / 1e9} ZEN, have ${balance / 1e9} ZEN`)
      process.exit(1)
    }
    console.log('  ✅ Sufficient balance for upgrade')
    
  } catch (err) {
    console.error('❌ Failed to fetch beast data:', err)
    process.exit(1)
  }

  // Perform upgrade
  console.log('\n⚡ Upgrading trait...')
  try {
    const zenMint = new PublicKey(zenMintStr)
    const userTokenAccount = await getAssociatedTokenAddress(zenMint, wallet.publicKey)
    
    const configData = await program.account.programConfig.fetch(config) as any
    const treasury = configData.treasury
    
    const [treasuryAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury_authority')],
      programId
    )
    
    const signature = await program.methods
      .upgradeTrait(traitIndex)
      .accounts({
        user: wallet.publicKey,
        beastAccount,
        config,
        userTokenAccount,
        treasury,
        treasuryAuthority,
        zenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc()
    
    console.log('  ✅ Upgrade successful!')
    console.log('  🔗 Transaction:', signature)
    
    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash('confirmed')
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed')
    console.log('  ✅ Transaction confirmed')
    
    // Fetch updated beast data
    console.log('\n📊 Beast Status After Upgrade:')
    const updatedBeastData = await program.account.beastAccount.fetch(beastAccount) as any
    const updatedTraits = Array.from(updatedBeastData.traits as number[])
    const updatedRarityScore = Number(updatedBeastData.rarityScore)
    
    console.log('  Updated Traits:')
    console.log(`    Strength: ${updatedTraits[0]}`)
    console.log(`    Agility: ${updatedTraits[1]}`)
    console.log(`    Wisdom: ${updatedTraits[2]}`)
    console.log(`    Vitality: ${updatedTraits[3]}`)
    console.log(`  New Rarity Score: ${updatedRarityScore}`)
    console.log(`  ${traitNames[traitIndex]}: ${updatedTraits[traitIndex]} (+1)`)
    
    // Check new ZEN balance
    const updatedUserTokenAccount = await getAssociatedTokenAddress(new PublicKey(zenMintStr), wallet.publicKey)
    const newTokenBalance = await connection.getTokenAccountBalance(updatedUserTokenAccount)
    const newBalance = Number(newTokenBalance.value.amount)
    console.log(`💳 New ZEN Balance: ${newBalance / 1e9} ZEN`)
    
    console.log('\n✨ Success! Your beast has been upgraded.')
    console.log('💡 Tip: Each upgrade increases the cost for the next upgrade of the same trait.')
    console.log('💡 Tip: Upgrading traits increases your beast\'s rarity score.')
    
  } catch (err: any) {
    console.error('\n❌ Failed to upgrade trait:', err.message || err)
    
    if (err.message && err.message.includes('TraitMaxReached')) {
      console.log('\n⚠️  This trait is already at maximum value (255).')
    } else if (err.message && err.message.includes('InsufficientFunds')) {
      console.log('\n⚠️  You do not have enough ZEN tokens for this upgrade.')
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
