import { PublicKey } from "@solana/web3.js";

const textEncoder = new TextEncoder();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Encode a u16 as a 2-byte little-endian buffer.
 * Used for PDA seed segments that include a domain/index as u16 LE.
 */
function u16LE(value: number): Uint8Array {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 0xffff
  ) {
    throw new Error(`u16LE: value must be an integer in [0, 65535], got ${value}`);
  }
  const buf = new Uint8Array(2);
  new DataView(buf.buffer).setUint16(0, value, /*littleEndian=*/ true);
  return buf;
}

/**
 * Derive vault authority PDA.
 * Seeds: ["vault", slab_key]
 */
export function deriveVaultAuthority(
  programId: PublicKey,
  slab: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode("vault"), slab.toBytes()],
    programId
  );
}

/**
 * Derive insurance LP mint PDA (a.k.a. LP vault mint PDA).
 * Seeds: ["lp_vault_mint", slab_key]
 * Wrapper anchor: src/percolator.rs:2543 derive_lp_vault_mint.
 */
export function deriveInsuranceLpMint(
  programId: PublicKey,
  slab: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode("lp_vault_mint"), slab.toBytes()],
    programId
  );
}

const LP_INDEX_U16_MAX = 0xffff;

/**
 * Derive LP PDA for TradeCpi.
 * Seeds: ["lp", slab_key, lp_idx as u16 LE]
 */
export function deriveLpPda(
  programId: PublicKey,
  slab: PublicKey,
  lpIdx: number
): [PublicKey, number] {
  if (
    typeof lpIdx !== "number" ||
    !Number.isInteger(lpIdx) ||
    lpIdx < 0 ||
    lpIdx > LP_INDEX_U16_MAX
  ) {
    throw new Error(
      `deriveLpPda: lpIdx must be an integer in [0, ${LP_INDEX_U16_MAX}], got ${lpIdx}`,
    );
  }
  const idxBuf = new Uint8Array(2);
  new DataView(idxBuf.buffer).setUint16(0, lpIdx, true);
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode("lp"), slab.toBytes(), idxBuf],
    programId
  );
}

// ---------------------------------------------------------------------------
// DEX Program IDs
// ---------------------------------------------------------------------------

/** PumpSwap AMM program ID. */
export const PUMPSWAP_PROGRAM_ID = new PublicKey(
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"
);

/** Raydium CLMM (Concentrated Liquidity) program ID. */
export const RAYDIUM_CLMM_PROGRAM_ID = new PublicKey(
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
);

/** Meteora DLMM (Dynamic Liquidity Market Maker) program ID. */
export const METEORA_DLMM_PROGRAM_ID = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);

// ---------------------------------------------------------------------------
// Pyth Push Oracle
// ---------------------------------------------------------------------------

/** Pyth Push Oracle program on mainnet. */
export const PYTH_PUSH_ORACLE_PROGRAM_ID = new PublicKey(
  "pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT"
);

// ---------------------------------------------------------------------------
// Creator Lock PDA (PERC-627)
// ---------------------------------------------------------------------------

/**
 * Seed used to derive the creator lock PDA.
 * Matches `creator_lock::CREATOR_LOCK_SEED` in percolator-prog.
 */
export const CREATOR_LOCK_SEED = "creator_lock";

/**
 * Derive the creator lock PDA for a given slab.
 * Seeds: ["creator_lock", slab_key]
 *
 * This PDA is required as accounts[9] in every LpVaultWithdraw instruction
 * since percolator-prog PR#170 (GH#1926 / PERC-8287).
 * Non-creator withdrawers must pass this key; if no lock exists on-chain the
 * enforcement is a no-op. The SDK must ALWAYS include it — passing it is mandatory.
 *
 * @param programId - The percolator program ID.
 * @param slab      - The slab (market) public key.
 * @returns [pda, bump]
 *
 * @example
 * ```ts
 * const [creatorLockPda] = deriveCreatorLockPda(PROGRAM_ID, slabKey);
 * ```
 */
export function deriveCreatorLockPda(
  programId: PublicKey,
  slab: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode(CREATOR_LOCK_SEED), slab.toBytes()],
    programId
  );
}

// ---------------------------------------------------------------------------
// LP Vault PDAs (v17 — tags 74-80)
// ---------------------------------------------------------------------------

/**
 * Derive the LP Vault registry PDA.
 * Seeds: ["lp_vault", marketGroup]
 *
 * Required by: CreateLpVault (tag 74), DepositToLpVault (tag 75),
 * RequestRedeemLpShares (tag 76), ExecuteRedemption (tag 77),
 * LpVaultCrankFees (tag 78), SetLpVaultPaused (tag 79), CloseLpVault (tag 80).
 *
 * Matches `constants::LP_VAULT_REGISTRY_SEED = b"lp_vault"` in v16_program.rs.
 *
 * @param programId   - The Percolator program ID.
 * @param marketGroup - The market group (slab) public key.
 * @returns [pda, bump]
 *
 * @example
 * ```ts
 * const [registryPda] = deriveLpVaultRegistry(PROGRAM_ID, marketGroupKey);
 * ```
 */
export function deriveLpVaultRegistry(
  programId: PublicKey,
  marketGroup: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode("lp_vault"), marketGroup.toBytes()],
    programId
  );
}

/**
 * Derive the LP redemption ticket PDA for a specific redeemer.
 * Seeds: ["lp_redemption", registry, redeemer]
 *
 * Required by: RequestRedeemLpShares (tag 76), ExecuteRedemption (tag 77).
 *
 * Matches `constants::LP_REDEMPTION_SEED = b"lp_redemption"` in v16_program.rs
 * and `derive_lp_redemption(program_id, registry, redeemer)` at line 3111.
 *
 * @param programId - The Percolator program ID.
 * @param registry  - The LP Vault registry PDA (from deriveLpVaultRegistry).
 * @param redeemer  - The wallet public key of the redeemer.
 * @returns [pda, bump]
 *
 * @example
 * ```ts
 * const [registryPda] = deriveLpVaultRegistry(PROGRAM_ID, marketGroupKey);
 * const [redemptionPda] = deriveLpRedemption(PROGRAM_ID, registryPda, walletKey);
 * ```
 */
export function deriveLpRedemption(
  programId: PublicKey,
  registry: PublicKey,
  redeemer: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      textEncoder.encode("lp_redemption"),
      registry.toBytes(),
      redeemer.toBytes(),
    ],
    programId
  );
}

/**
 * Derive the LP backing-domain ledger PDA.
 * Seeds: ["lp_backing_ledger", marketGroup, u16LE(domainIdx)]
 *
 * Required by: DepositToLpVault (tag 75) at accounts[7],
 * LpVaultCrankFees (tag 78) at accounts[3].
 *
 * Matches `constants::LP_BACKING_LEDGER_SEED = b"lp_backing_ledger"` and
 * `derive_lp_backing_ledger(program_id, market_group, domain: u16)` in v16_program.rs
 * (line 3127) — domain is encoded as 2-byte little-endian.
 *
 * @param programId   - The Percolator program ID.
 * @param marketGroup - The market group (slab) public key.
 * @param domainIdx   - The backing domain index as a u16 integer (0–65535).
 * @returns [pda, bump]
 *
 * @example
 * ```ts
 * const [ledgerPda] = deriveLpBackingLedger(PROGRAM_ID, marketGroupKey, 0);
 * ```
 */
export function deriveLpBackingLedger(
  programId: PublicKey,
  marketGroup: PublicKey,
  domainIdx: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      textEncoder.encode("lp_backing_ledger"),
      marketGroup.toBytes(),
      u16LE(domainIdx),
    ],
    programId
  );
}

/**
 * Derive the LP escrow SPL token account PDA.
 * Seeds: ["lp_escrow", marketGroup]
 *
 * The escrow is owned by the registry PDA and holds LP tokens during the
 * redemption window. Required by ExecuteRedemption (tag 77).
 *
 * Matches `constants::LP_ESCROW_SEED = b"lp_escrow"` and
 * `derive_lp_escrow(program_id, market_group)` in v16_program.rs (line 3157).
 *
 * @param programId   - The Percolator program ID.
 * @param marketGroup - The market group (slab) public key.
 * @returns [pda, bump]
 *
 * @example
 * ```ts
 * const [escrowPda] = deriveLpEscrow(PROGRAM_ID, marketGroupKey);
 * ```
 */
export function deriveLpEscrow(
  programId: PublicKey,
  marketGroup: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode("lp_escrow"), marketGroup.toBytes()],
    programId
  );
}

// ---------------------------------------------------------------------------
// NFT Registry PDA (v17 — tag 73)
// ---------------------------------------------------------------------------

/**
 * Derive the per-market NFT program-id registry PDA.
 * Seeds: ["nft_registry", marketGroup]
 *
 * Required by: SetNftProgramId (tag 73) and the wrapper's NFT B-3 CPI path
 * (TransferPortfolioOwnership, tag 72).
 *
 * Matches `constants::NFT_REGISTRY_SEED = b"nft_registry"` and
 * `derive_nft_registry(program_id, market_group)` in v16_program.rs (line 3274).
 *
 * @param programId   - The Percolator program ID.
 * @param marketGroup - The market group (slab) public key.
 * @returns [pda, bump]
 *
 * @example
 * ```ts
 * const [nftRegistryPda] = deriveNftRegistry(PROGRAM_ID, marketGroupKey);
 * ```
 */
export function deriveNftRegistry(
  programId: PublicKey,
  marketGroup: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode("nft_registry"), marketGroup.toBytes()],
    programId
  );
}

// ---------------------------------------------------------------------------
// Matcher Delegate PDA (v17 — TradeCpi tag 10 / BatchTradeCpi tag 67)
// ---------------------------------------------------------------------------

/**
 * Derive the matcher delegate PDA.
 * Seeds: ["matcher", market, accountB, accountBOwner, matcherProg, matcherCtx]
 * (all six seed segments are 32-byte public keys)
 *
 * Required by TradeCpi (tag 10) at accounts[6] and BatchTradeCpi (tag 67).
 * The program signs CPI calls to the external matcher program using this PDA.
 *
 * Matches `derive_matcher_delegate(program_id, market_key, maker_account,
 * maker_owner, matcher_program, matcher_context)` in v16_program.rs (line 13642).
 *
 * @param programId     - The Percolator program ID.
 * @param market        - The market (slab) public key.
 * @param accountB      - The maker/LP portfolio account public key.
 * @param accountBOwner - The owner of accountB.
 * @param matcherProg   - The external matcher program public key.
 * @param matcherCtx    - The matcher context account public key.
 * @returns [pda, bump]
 *
 * @example
 * ```ts
 * const [delegatePda] = deriveMatcherDelegate(
 *   PROGRAM_ID,
 *   marketKey,
 *   accountBKey,
 *   accountBOwnerKey,
 *   matcherProgKey,
 *   matcherCtxKey,
 * );
 * ```
 */
export function deriveMatcherDelegate(
  programId: PublicKey,
  market: PublicKey,
  accountB: PublicKey,
  accountBOwner: PublicKey,
  matcherProg: PublicKey,
  matcherCtx: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      textEncoder.encode("matcher"),
      market.toBytes(),
      accountB.toBytes(),
      accountBOwner.toBytes(),
      matcherProg.toBytes(),
      matcherCtx.toBytes(),
    ],
    programId
  );
}

/** 32-byte feed id as 64 hex digits (optional `0x` prefix after trim). */
const PYTH_FEED_ID_HEX_LEN = 64;

function normalizePythFeedIdHex(feedIdHex: string): string {
  let s = feedIdHex.trim();
  if (s.startsWith("0x") || s.startsWith("0X")) {
    s = s.slice(2);
  }
  return s;
}

/**
 * Derive the Pyth Push Oracle PDA for a given feed ID.
 * Seeds: [shard_id(u16 LE, always 0), feed_id(32 bytes)]
 * Program: pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT
 */
const FEED_HEX_RE = /^[0-9a-fA-F]{64}$/;

export function derivePythPushOraclePDA(feedIdHex: string): [PublicKey, number] {
  const normalized = normalizePythFeedIdHex(feedIdHex);
  if (!FEED_HEX_RE.test(normalized)) {
    throw new Error(
      `derivePythPushOraclePDA: feedIdHex must be 64 hex digits (32 bytes); got ${normalized.length === 64 ? "non-hexadecimal characters" : normalized.length + " chars"}`,    );
  }
  const feedId = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    feedId[i] = parseInt(normalized.substring(i * 2, i * 2 + 2), 16);
  }
  const shardBuf = new Uint8Array(2); // shard_id = 0 (u16 LE)
  return PublicKey.findProgramAddressSync(
    [shardBuf, feedId],
    PYTH_PUSH_ORACLE_PROGRAM_ID,
  );
}
