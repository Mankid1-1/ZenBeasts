import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'

export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID as string)

export function getProgram(connection: Connection, wallet: any) {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  return new Program({} as Idl, PROGRAM_ID, provider)
}

export function getProgramConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)
}

export function getBeastPDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('beast'), mint.toBuffer()], PROGRAM_ID)
}

export function getMetadataPDA(mint: PublicKey): [PublicKey, number] {
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
  return PublicKey.findProgramAddressSync([Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()], TOKEN_METADATA_PROGRAM_ID)
}

export function getMasterEditionPDA(mint: PublicKey): [PublicKey, number] {
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
  return PublicKey.findProgramAddressSync([Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer(), Buffer.from('edition')], TOKEN_METADATA_PROGRAM_ID)
}