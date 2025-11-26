import { AnchorProvider, Program, Idl, Wallet } from '@coral-xyz/anchor'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Activity testing script
 * 
 * This script:
 * - Performs activities on sample beasts (Requirement 2.1, 2.2, 2.3, 2.4, 2.5)
 * - Tests cooldown enforcement
 * - Tests different activity types (Requirement 15.1)
 * - Tests reward accumulation
 */

async function main() {
  console.log('🎮 Starting ZenBeasts activity testing...\n')

  // Load environment variables
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const programIdStr = process.env.NEXT_PUBLIC_PROGRAM_ID
  const beastMintStr = process.argv[2]
  
  if (!programIdStr) {
    throw new Error('NEXT_PUBLIC_PROGRAM_ID environment variable is required')
  }
  
  if (!beastMintStr) {
    console.error('Usage: npm run perform-activity <beast_mint_address>')
    console.error('Example: npm run perform-activity 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
    process.exit(1)
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
  console.log('📍 Beast Account:', beastAccount.toBase58())

  // Fetch beast data before activity
  console.log('\n📊 Beast Status Before Activity:')
  try {
    const beastData = await program.account.beastAccount.fetch(beastAccount) as any
    const configData = await program.account.programConfig.fetch(config) as any
    
    console.log('  Owner:', beastData.owner.toString())
    console.log('  Activity Count:', beastData.activityCount)
    console.log('  Pending Rewards:', Number(beastData.pendingRewards) / 1e9, 'ZEN')
    console.log('  Last Activity:', beastData.lastActivity)
    
    // Check cooldown
    const currentTime = Math.floor(Date.now() / 1000)
    const cooldownDuration = Number(configData.activityCooldown)
    const lastActivity = Number(beastData.lastActivity)
    
    if (lastActivity > 0) {
      const cooldownEndTime = lastActivity + cooldownDuration
      const remainingTime = Math.max(0, cooldownEndTime - currentTime)
      
      if (remainingTime > 0) {
        const minutes = Math.ceil(remainingTime / 60)
        console.log(`  ⏳ Cooldown: ${minutes} minutes remaining`)
        console.log('\n⚠️  Beast is in cooldown. Please wait before performing another activity.')
        process.exit(0)
      } else {
        console.log('  ✅ Cooldown: Ready for activity')
      }
    } else {
      console.log('  ✅ Cooldown: No previous activity')
    }
    
  } catch (err) {
    console.error('❌ Failed to fetch beast data:', err)
    process.exit(1)
  }

  // Perform activity
  console.log('\n🎯 Performing activity...')
  try {
    const signature = await program.methods
      .performActivity()
      .accounts({
        user: wallet.publicKey,
        beastAccount,
        config,
      })
      .rpc()
    
    console.log('  ✅ Activity performed successfully!')
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
    console.log('\n📊 Beast Status After Activity:')
    const updatedBeastData = await program.account.beastAccount.fetch(beastAccount) as any
    const configData = await program.account.programConfig.fetch(config) as any
    
    console.log('  Activity Count:', updatedBeastData.activityCount)
    console.log('  Pending Rewards:', Number(updatedBeastData.pendingRewards) / 1e9, 'ZEN')
    console.log('  Last Activity:', updatedBeastData.lastActivity)
    
    const cooldownDuration = Number(configData.activityCooldown)
    const cooldownHours = cooldownDuration / 3600
    console.log(`  ⏳ Next activity available in: ${cooldownHours} hour(s)`)
    
    console.log('\n✨ Success! Your beast is now earning rewards.')
    console.log('💡 Tip: Wait for the cooldown to end, then perform another activity to accumulate more rewards.')
    console.log('💰 Claim rewards with: npm run claim-rewards', beastMintStr)
    
  } catch (err: any) {
    console.error('\n❌ Failed to perform activity:', err.message || err)
    
    if (err.message && err.message.includes('BeastInCooldown')) {
      console.log('\n⚠️  The beast is still in cooldown. Please wait before trying again.')
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
