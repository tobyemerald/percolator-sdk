// Probe: send solo KeeperCrank (no UpdateHyperpMark bundle).
// Goal: isolate whether OracleStale fires from mark_ewma_last_slot staleness
// or from something else.

import {
  Connection, Keypair, PublicKey, TransactionInstruction,
  TransactionMessage, VersionedTransaction,
  ComputeBudgetProgram, SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { encodeKeeperCrank } from '/Users/khubair/percolator-sdk/dist/index.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const RPC = 'https://api.mainnet-beta.solana.com';
const PROGRAM_ID = new PublicKey('ESa89R5Es3rJ5mnwGybVRG1GrNt9etP11Z5V2QWD4edv');
const SLAB = new PublicKey('H7CVBttJmyAiae3bsKSCz8DbrPtKwMhs4NeFmQ9okhpz');
const ADMIN_KEY = path.join(os.homedir(), '.percolator-mainnet', 'keys', 'deploy-authority.json');

const conn = new Connection(RPC, 'confirmed');
const admin = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(ADMIN_KEY, 'utf8'))));

const data = encodeKeeperCrank({ callerIdx: 65535 });
console.log('KeeperCrank ix data:', Buffer.from(data).toString('hex'), '(', data.length, 'bytes)');

const ixs = [
  ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
  new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin.publicKey,     isSigner: true,  isWritable: true },
      { pubkey: SLAB,                isSigner: false, isWritable: true },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SLAB,                isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  }),
];
const { blockhash } = await conn.getLatestBlockhash('confirmed');
const message = new TransactionMessage({ payerKey: admin.publicKey, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message();
const tx = new VersionedTransaction(message);

console.log('Simulating solo KeeperCrank (no UpdateHyperpMark bundled)...');
const sim = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
console.log('err:', JSON.stringify(sim.value.err));
console.log('CU:', sim.value.unitsConsumed);
console.log('---logs---');
(sim.value.logs ?? []).forEach(l => console.log(' ', l));
