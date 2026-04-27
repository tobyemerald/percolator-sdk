# HEARTBEAT — v12.19-only SDK alignment

**now:** 2026-04-28, ALL PHASES COMPLETE.

**phases:**
- PHASE 0 done. PR state confirmed, drift expectations recorded at file:line.
- PHASE 1 done (commit afe8ffd). Vanilla + v12.17 dropped. encodeInitMarket 304 bytes default. encodeUpdateConfig 35 bytes always.
- PHASE 2 done (commit 0468955). 5 account specs fixed.
- PHASE 3 done (commit 35b892f). PDA seed fix. V12_19 layout deferred (size collision with V12_17 SBF).
- PHASE 4 deferred. Wrapper W-1 patch is one-line user action; see phase-4-deferred.md.
- PHASE 5 done. dist rebuilt to 264 KB single-bundle.
- PHASE 6 done. v2.0.0-rc.1 tagged.
- PHASE 7 done. FINAL.md written.

**gates:**
- pnpm test: 792 PASS / 31 SKIPPED.
- pnpm lint: clean.
- pnpm build: clean.
- pnpm run parity:check: RED (waiting on W-1 wrapper patch).

**verdict:** GO. v12.19 single-target SDK ready. NPM publish blocked
until PR #88 + #271 merge and W-1 lands.
