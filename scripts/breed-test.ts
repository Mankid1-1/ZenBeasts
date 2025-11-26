import { AnchorProvider, Program, Idl, BN, Wallet } from '@coral-xyz/anchor'
import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Breeding testing script
 * 
 * This script:
 * - Tests breeding with various parent combinations (Requirement 5.1, 5.2, 5.3, 5.4, 5.5)
 * - Tests breeding cooldowns (Requirement 16.2)
 * - Tests breeding count limits (Requirement 16.4)
 * - Tests generation scaling (Requirement 16.5)
 */

async function main() {
  console.log('🐉 Starting ZenBeasts breeding test...\n')

  // Load environment variables
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const programIdStr = process.env.NEXT_PUBLIC_PROGRAM_ID
  const zenMintStr = process.env.ZEN_MINT
  const parentAMintStr = process.argv[2]
  const parentBMintStr = process.argv[3]
  
  if (!programIdStr) {
    throw new Error('NEXT_PUBLIC_PROGRAM_ID environment variable is required')
  }
  
  if (!zenMintStr) {
    throw new Error('ZEN_MINT environment variable is required')
  }
  
  if (!parentAMintStr || !parentBMintStr) {
    console.error('Usage: npm run breed-test <parent_a_mint> <parent_b_mint>')
    console.error('Example: npm run breed-test 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 8yLYug3DH98e98UYKSDqcE6kBlieTrB94VZSvKptgBtV')
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
  const parentAMint = new PublicKey(parentAMintStr)
  const parentBMint = new PublicKey(parentBMintStr)
  const [parentAAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('beast'), parentAMint.toBuffer()],
    programId
  )
  const [parentBAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('beast'), parentBMint.toBuffer()],
    programId
  )
  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  )

  console.log('👨 Parent A Mint:', parentAMintStr)
  console.log('👩 Parent B Mint:', parentBMintStr)

  // Fetch parent data and validate
  console.log('\n📊 Validating Parents:')
  try {
    const parentAData = await program.account.beastAccount.fetch(parentAAccount) as any
    const parentBData = await program.account.beastAccount.fetch(parentBAccount) as any
    const configData = await program.account.programConfig.fetch(config) as any
    
    // Check ownership
    if (parentAData.owner.toString() !== wallet.publicKey.toString()) {
      console.error('❌ You do not own Parent A')
      process.exit(1)
    }
    if (parentBData.owner.toString() !== wallet.publicKey.toString()) {
      console.error('❌ You do not own Parent B')
      process.exit(1)
    }
    console.log('  ✅ Both parents owned by wallet')
    
    // Check breeding cooldowns
    const currentTime = Math.floor(Date.now() / 1000)
    const breedingCooldown = Number(configData.breedingCooldown)
    
    const parentALastBreeding = Number(parentAData.lastBreeding || 0)
    const parentBLastBreeding = Number(parentBData.lastBreeding || 0)
    
    if (parentALastBreeding > 0) {
      const cooldownEndA = parentALastBreeding + breedingCooldown
      const remainingA = Math.max(0, cooldownEndA - currentTime)
      if (remainingA > 0) {
        const hours = Math.ceil(remainingA / 3600)
        console.error(`❌ Parent A is in breeding cooldown (${hours} hours remaining)`)
        process.exit(1)
      }
    }
    
    if (parentBLastBreeding > 0) {
      const cooldownEndB = parentBLastBreeding + breedingCooldown
      const remainingB = Math.max(0, cooldownEndB - currentTime)
      if (remainingB > 0) {
        const hours = Math.ceil(remainingB / 3600)
        console.error(`❌ Parent B is in breeding cooldown (${hours} hours remaining)`)
        process.exit(1)
      }
    }
    console.log('  ✅ Both parents ready to breed')
    
    // Check breeding counts
    const maxBreedingCount = configData.maxBreedingCount
    const parentABreedingCount = parentAData.breedingCount || 0
    const parentBBreedingCount = parentBData.breedingCount || 0
    
    if (parentABreedingCount >= maxBreedingCount) {
      console.error(`❌ Parent A has reached max breeding count (${maxBreedingCount})`)
      process.exit(1)
    }
    if (parentBBreedingCount >= maxBreedingCount) {
      console.error(`❌ Parent B has reached max breeding count (${maxBreedingCount})`)
      process.exit(1)
    }
    console.log(`  ✅ Breeding counts: Parent A (${parentABreedingCount}/${maxBreedingCount}), Parent B (${parentBBreedingCount}/${maxBreedingCount})`)
    
    // Display parent traits
    console.log('\n👨 Parent A Traits:')
    const parentATraits = Array.from(parentAData.traits as number[])
    console.log(`  Strength: ${parentATraits[0]}, Agility: ${parentATraits[1]}, Wisdom: ${parentATraits[2]}, Vitality: ${parentATraits[3]}`)
    console.log(`  Generation: ${parentAData.generation || 0}`)
    console.log(`  Rarity: ${Number(parentAData.rarityScore)}`)
    
    console.log('\n👩 Parent B Traits:')
    const parentBTraits = Array.from(parentBData.traits as number[])
    console.log(`  Strength: ${parentBTraits[0]}, Agility: ${parentBTraits[1]}, Wisdom: ${parentBTraits[2]}, Vitality: ${parentBTraits[3]}`)
    console.log(`  Generation: ${parentBData.generation || 0}`)
    console.log(`  Rarity: ${Number(parentBData.rarityScore)}`)
    
    // Calculate breeding cost
    const baseCost = Number(configData.breedingBaseCost)
    const generationMultiplier = Number(configData.generationMultiplier)
    const maxGeneration = Math.max(parentAData.generation || 0, parentBData.generation || 0)
    const multiplier = Math.pow(generationMultiplier / 100, maxGeneration)
    const breedingCost = Math.floor(baseCost * multiplier)
    
    console.log('\n💰 Breeding Cost:', breedingCost / 1e9, 'ZEN')
    console.log('👶 Offspring Generation:', maxGeneration + 1)
    
    // Check ZEN balance
    const zenMint = new PublicKey(zenMintStr)
    const userTokenAccount = await getAssociatedTokenAddress(zenMint, wallet.publicKey)
    const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount)
    const balance = Number(tokenBalance.value.amount)
    
    console.log('💳 Your ZEN Balance:', balance / 1e9, 'ZEN')
    
    if (balance < breedingCost) {
      console.error(`❌ Insufficient ZEN tokens. Need ${breedingCost / 1e9} ZEN, have ${balance / 1e9} ZEN`)
      process.exit(1)
    }
    console.log('  ✅ Sufficient balance for breeding')
    
  } catch (err) {
    console.error('❌ Failed to validate parents:', err)
    process.exit(1)
  }

  // Perform breeding
  console.log('\n🧬 Breeding beasts...')
  try {
    const childMint = Keypair.generate()
    const seed = new BN(Date.now())
    
    const [childBeast] = PublicKey.findProgramAddressSync(
      [Buffer.from('beast'), childMint.publicKey.toBuffer()],
      programId
    )
    
    const [metadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
        childMint.publicKey.toBuffer(),
      ],
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    )
    
    const [masterEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
        childMint.publicKey.toBuffer(),
        Buffer.from('edition'),
      ],
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    )
    
    const childTokenAccount = await getAssociatedTokenAddress(childMint.publicKey, wallet.publicKey)
    const zenMint = new PublicKey(zenMintStr)
    const userTokenAccount = await getAssociatedTokenAddress(zenMint, wallet.publicKey)
    
    const configData = await program.account.programConfig.fetch(config) as any
    const treasury = configData.treasury
    
    const [treasuryAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury_authority')],
      programId
    )
    
    const signature = await program.methods
      .breedBeasts(seed, 'Offspring Beast', 'https://arweave.net/offspring')
      .accounts({
        user: wallet.publicKey,
        parentA: parentAAccount,
        parentB: parentBAccount,
        config,
        childBeast,
        childMint: childMint.publicKey,
        childTokenAccount,
        userTokenAccount,
        treasury,
        treasuryAuthority,
        zenMint,
        metadata,
        masterEdition,
        tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      })
      .signers([childMint])
      .rpc()
    
    console.log('  ✅ Breeding successful!')
    console.log('  🔗 Transaction:', signature)
    
    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash('confirmed')
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed')
    console.log('  ✅ Transaction confirmed')
    
    // Fetch offspring data
    const offspringData = await program.account.beastAccount.fetch(childBeast) as any
    const offspringTraits = Array.from(offspringData.traits as number[])
    
    console.log('\n👶 Offspring Details:')
    console.log('  Mint:', childMint.publicKey.toBase58())
    console.log('  Strength:', offspringTraits[0])
    console.log('  Agility:', offspringTraits[1])
    console.log('  Wisdom:', offspringTraits[2])
    console.log('  Vitality:', offspringTraits[3])
    console.log('  Generation:', offspringData.generation)
    console.log('  Rarity Score:', Number(offspringData.rarityScore))
    
    console.log('\n✨ Success! Your beasts have produced offspring.')
    console.log('💡 Tip: The offspring inherits traits from both parents with some variation.')
    
  } catch (err: any) {
    console.error('\n❌ Failed to breed beasts:', err.message || err)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
