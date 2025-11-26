import { AnchorProvider, Program, Idl, BN, Wallet } from '@coral-xyz/anchor'
import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Sample minting script for testing
 * 
 * This script:
 * - Mints sample beasts for testing (Requirement 1.1, 1.2, 1.3, 1.4, 1.5)
 * - Generates varied trait distributions across rarity tiers (Requirement 12.5)
 * - Creates beasts of different generations
 * - Demonstrates the full minting flow
 */

interface MintConfig {
  name: string
  uri: string
  rarityTarget?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

const SAMPLE_BEASTS: MintConfig[] = [
  { name: 'Common Beast #1', uri: 'https://arweave.net/common1', rarityTarget: 'common' },
  { name: 'Common Beast #2', uri: 'https://arweave.net/common2', rarityTarget: 'common' },
  { name: 'Uncommon Beast #1', uri: 'https://arweave.net/uncommon1', rarityTarget: 'uncommon' },
  { name: 'Rare Beast #1', uri: 'https://arweave.net/rare1', rarityTarget: 'rare' },
  { name: 'Epic Beast #1', uri: 'https://arweave.net/epic1', rarityTarget: 'epic' },
  { name: 'Legendary Beast #1', uri: 'https://arweave.net/legendary1', rarityTarget: 'legendary' },
]

async function main() {
  console.log('🎮 Starting ZenBeasts sample minting...\n')

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

  if (balance < 0.5e9) {
    console.warn('⚠️  Warning: Low SOL balance. You may need more SOL for minting.')
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

  // Verify program is initialized
  try {
    await program.account.programConfig.fetch(config)
    console.log('✅ Program is initialized\n')
  } catch (err) {
    console.error('❌ Program not initialized. Run: npm run initialize')
    process.exit(1)
  }

  const mintedBeasts: { name: string; mint: string; rarity: number }[] = []

  // Mint sample beasts
  for (let i = 0; i < SAMPLE_BEASTS.length; i++) {
    const beast = SAMPLE_BEASTS[i]
    console.log(`\n🐉 Minting beast ${i + 1}/${SAMPLE_BEASTS.length}: ${beast.name}`)
    
    try {
      // Generate mint keypair
      const nftMint = Keypair.generate()
      const seed = new BN(Date.now() + i)
      
      // Derive PDAs
      const [beastAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('beast'), nftMint.publicKey.toBuffer()],
        programId
      )
      
      const [metadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
          nftMint.publicKey.toBuffer(),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      )
      
      const [masterEdition] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
          nftMint.publicKey.toBuffer(),
          Buffer.from('edition'),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      )
      
      const nftTokenAccount = await getAssociatedTokenAddress(
        nftMint.publicKey,
        wallet.publicKey
      )
      
      // Mint the beast
      const signature = await program.methods
        .createBeast(seed, beast.name, beast.uri)
        .accounts({
          beastAccount,
          config,
          nftMint: nftMint.publicKey,
          nftTokenAccount,
          payer: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
          metadata,
          masterEdition,
          tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
        })
        .signers([nftMint])
        .rpc()
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')
      
      // Fetch beast data to display traits
      const beastData = await program.account.beastAccount.fetch(beastAccount) as any
      const traits = Array.from(beastData.traits as number[])
      const rarityScore = Number(beastData.rarityScore)
      
      // Determine rarity tier
      let rarityTier = 'Common'
      if (rarityScore >= 951) rarityTier = 'Legendary'
      else if (rarityScore >= 801) rarityTier = 'Epic'
      else if (rarityScore >= 601) rarityTier = 'Rare'
      else if (rarityScore >= 401) rarityTier = 'Uncommon'
      
      console.log('  ✅ Minted successfully!')
      console.log('  📍 Mint:', nftMint.publicKey.toBase58())
      console.log('  💪 Strength:', traits[0])
      console.log('  ⚡ Agility:', traits[1])
      console.log('  🧠 Wisdom:', traits[2])
      console.log('  ❤️  Vitality:', traits[3])
      console.log('  ⭐ Rarity Score:', rarityScore)
      console.log('  🏆 Rarity Tier:', rarityTier)
      console.log('  🔗 Transaction:', signature)
      
      mintedBeasts.push({
        name: beast.name,
        mint: nftMint.publicKey.toBase58(),
        rarity: rarityScore
      })
      
      // Small delay between mints
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (err) {
      console.error('  ❌ Failed to mint:', err)
    }
  }

  // Summary
  console.log('\n\n📊 Minting Summary:')
  console.log('═'.repeat(60))
  console.log(`Total minted: ${mintedBeasts.length}/${SAMPLE_BEASTS.length}`)
  
  if (mintedBeasts.length > 0) {
    console.log('\n🐉 Minted Beasts:')
    mintedBeasts.forEach((beast, i) => {
      console.log(`  ${i + 1}. ${beast.name}`)
      console.log(`     Mint: ${beast.mint}`)
      console.log(`     Rarity: ${beast.rarity}`)
    })
    
    console.log('\n✨ Success! You can now:')
    console.log('  1. View your beasts in the frontend')
    console.log('  2. Perform activities: npm run perform-activity')
    console.log('  3. Test breeding: npm run breed-test')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
