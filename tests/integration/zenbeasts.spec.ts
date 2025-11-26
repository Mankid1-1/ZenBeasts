import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import assert from 'assert'

const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const PROGRAM_ID_STR = process.env.NEXT_PUBLIC_PROGRAM_ID || ''

describe('zenbeasts', () => {
  it('program setup', async () => {
    assert.ok(PROGRAM_ID_STR.length > 0)
    const connection = new Connection(RPC, { commitment: 'confirmed' })
    const wallet = Keypair.generate()
    const provider = new AnchorProvider(connection, { publicKey: wallet.publicKey } as any, { commitment: 'confirmed' })
    const program = new Program({ version: '0.1.0', name: 'zenbeasts', instructions: [] } as Idl, new PublicKey(PROGRAM_ID_STR), provider)
    assert.ok(program)
  })
})