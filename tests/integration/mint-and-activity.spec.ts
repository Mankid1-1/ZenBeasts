import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createMint, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import idl from '../../frontend/src/lib/anchor/idl.json'
import assert from 'assert'

const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const PROGRAM_ID_STR = process.env.NEXT_PUBLIC_PROGRAM_ID || ''
const RUN_DEVNET_TX = process.env.RUN_DEVNET_TX === '1'

function makeWallet(kp: Keypair) {
  return {
    publicKey: kp.publicKey,
    payer: kp,
    signTransaction: async (tx: Transaction) => {
      tx.partialSign(kp)
      return tx
    },
    signAllTransactions: async (txs: Transaction[]) => {
      txs.forEach((tx) => tx.partialSign(kp))
      return txs
    }
  } as any
}

async function airdrop(connection: Connection, pubkey: PublicKey, lamports: number) {
  const sig = await connection.requestAirdrop(pubkey, lamports)
  await connection.confirmTransaction(sig, 'confirmed')
}

describe('zenbeasts e2e', () => {
  it('initialize, mint beast, and perform activity (gated)', async () => {
    assert.ok(PROGRAM_ID_STR.length > 0)
    const connection = new Connection(RPC, { commitment: 'confirmed' })
    const kp = Keypair.generate()
    const wallet = makeWallet(kp)
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
    const program = new Program(idl as Idl, new PublicKey(PROGRAM_ID_STR), provider)


    const nftMint = Keypair.generate()
    const seed = new BN(Date.now())
    const name = 'Test Beast'
    const uri = 'https://example.com/metadata.json'
    const nftAta = await getAssociatedTokenAddress(nftMint.publicKey, kp.publicKey)

    const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    const metadataPda = PublicKey.findProgramAddressSync([
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      nftMint.publicKey.toBuffer()
    ], TOKEN_METADATA_PROGRAM_ID)[0]
    const masterEditionPda = PublicKey.findProgramAddressSync([
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      nftMint.publicKey.toBuffer(),
      Buffer.from('edition')
    ], TOKEN_METADATA_PROGRAM_ID)[0]

    const configPda = PublicKey.findProgramAddressSync([Buffer.from('config')], new PublicKey(PROGRAM_ID_STR))[0]
    const beastPda = PublicKey.findProgramAddressSync([Buffer.from('beast'), nftMint.publicKey.toBuffer()], new PublicKey(PROGRAM_ID_STR))[0]

    assert.ok(nftAta && metadataPda && masterEditionPda && beastPda && configPda)

    if (RUN_DEVNET_TX) {
      await airdrop(connection, kp.publicKey, 2_000_000_000)
      const zenMint = await createMint(connection, kp, kp.publicKey, null, 9)
      const treasuryAta = await getOrCreateAssociatedTokenAccount(connection, kp, zenMint, kp.publicKey)

      await program.methods.initialize(new BN(60)).accounts({
        config: configPda,
        authority: kp.publicKey,
        zenMint,
        treasury: treasuryAta.address,
        systemProgram: SystemProgram.programId
      }).rpc()

      const txSig = await program.methods.createBeast(seed, name, uri).accounts({
        beastAccount: beastPda,
        config: configPda,
        nftMint: nftMint.publicKey,
        nftTokenAccount: nftAta,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        payer: kp.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID
      }).signers([nftMint]).rpc()

      assert.ok(txSig)

      await program.methods.performActivity(0).accounts({
        payer: kp.publicKey,
        beastAccount: beastPda,
        programState: configPda
      }).rpc()

      const beastAccount = await (program.account as any).beastAccount.fetch(beastPda)
      assert.strictEqual(beastAccount.owner.toString(), kp.publicKey.toString())
      assert.strictEqual(beastAccount.mint.toString(), nftMint.publicKey.toString())
      assert.ok(beastAccount.activityCount > 0)

      await program.methods.claimRewards().accounts({
        user: kp.publicKey,
        beastAccount: beastPda
      }).rpc()

      const afterClaim = await (program.account as any).beastAccount.fetch(beastPda)
      assert.strictEqual(afterClaim.pendingRewards, 0)

      try {
        await program.methods.claimRewards().accounts({
          user: kp.publicKey,
          beastAccount: beastPda
        }).rpc()
        assert.fail('Expected NoRewardsToClaim error')
      } catch (err: any) {
        assert.ok(err)
      }
    }
  })
})