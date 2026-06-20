import { performance } from "perf_hooks";
import { prisma } from "db";
import { placeOrder as heapPlaceOrder, resetBooks, hydrateAllBooks } from "./src/lib/heapMatchingEngine";
import { placeOrder as legacyPlaceOrder } from "./src/lib/matchingEngine";
import { OrderBook } from "./src/orderbook/orderbook";
import type { EngineOrder } from "./src/types/types";

// ─── engine toggle ─────────────────────────────────────────────────────────

const ENGINE: "heap" | "legacy" = "heap"; // ← set to "legacy" to compare

const placeOrder = ENGINE === "heap" ? heapPlaceOrder : legacyPlaceOrder;

// ─── constants ──────────────────────────────────────────────────────────────

const MARKET_ID = "bench-market";
const PREFIX = "bench_u";

const QTY = 5;
const PRICE = 50;

const USER_COUNT = 300;
const POOL_SIZE = 200;

// ─── helpers ────────────────────────────────────────────────────────────────

function report(label: string, latencies: number[]) {
  if (latencies.length === 0) return;
  const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length;
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50  = sorted[Math.floor(sorted.length * 0.50)];
  const p95  = sorted[Math.floor(sorted.length * 0.95)];
  const p99  = sorted[Math.floor(sorted.length * 0.99)];
  console.log(`  ${label}: avg=${avg.toFixed(1)}  p95=${p95.toFixed(1)}  p99=${p99.toFixed(1)}  n=${latencies.length}`);
}

function uid(i: number) {
  return `${PREFIX}${i}`;
}

// ─── 1. SETUP ─────────────────────────────────────────────────────────────

async function setup() {
  console.log(`🧱 Setup: ${USER_COUNT} users, market, positions …`);

  await prisma.market.upsert({
    where: { id: MARKET_ID },
    update: {},
    create: {
      id: MARKET_ID,
      title: "Benchmark Market",
      description: "Perf test market",
      resolutionDeadline: new Date(Date.now() + 3600_000),
      isResolved: false,
    },
  });

  for (let i = 0; i < USER_COUNT; i += 10) {
    await Promise.all(
      Array.from({ length: Math.min(10, USER_COUNT - i) }, async (_, j) => {
        const id = uid(i + j);
        await prisma.user.upsert({
          where: { id },
          update: {},
          create: { id, supabaseUid: `bench-${id}`, usdBalance: 1_000_000, lockedBalance: 0 },
        });
        await prisma.position.upsert({
          where: { userId_marketId: { userId: id, marketId: MARKET_ID } },
          update: {},
          create: { userId: id, marketId: MARKET_ID, yesShares: 10_000, noShares: 10_000 },
        });
      }),
    );
  }

  console.log("✅ Setup complete");
}

// ─── 2. CLEANUP & RESET ──────────────────────────────────────────────────

async function cleanMarket() {
  // Delete trades first (they hold FK to orders)
  await prisma.trade.deleteMany({ where: { marketId: MARKET_ID } });

  // Retry order deletion: fire-and-forget maker updates can sneak in new
  // trades between the trade delete and the order delete.
  for (let attempt = 0; ; attempt++) {
    try {
      await prisma.order.deleteMany({ where: { marketId: MARKET_ID } });
      break;
    } catch (e: any) {
      if (e?.code !== "P2003" || attempt >= 2) throw e;
      // Drain sneaky async trades, then retry
      await prisma.trade.deleteMany({ where: { marketId: MARKET_ID } });
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  await prisma.marketAnalysis.deleteMany({ where: { marketId: MARKET_ID } });
}

/** Reset users' balances and positions to original state. */
async function resetState() {
  await prisma.user.updateMany({
    where: { supabaseUid: { startsWith: "bench-" } },
    data: { usdBalance: 1_000_000, lockedBalance: 0 },
  });
  await prisma.position.updateMany({
    where: { marketId: MARKET_ID },
    data: { yesShares: 10_000, noShares: 10_000, lockedYesShares: 0, lockedNoShares: 0, totalSpent: 0 },
  });
}

async function cleanEverything() {
  await cleanMarket();
  await prisma.position.deleteMany({ where: { marketId: MARKET_ID } });
  await prisma.market.deleteMany({ where: { id: MARKET_ID } });
  await prisma.user.deleteMany({ where: { supabaseUid: { startsWith: "bench-" } } });
}

// ─── 3. SEEDING (cycles through POOL_SIZE users for speed) ─────────────

async function seedSellOrders(
  count: number,
  price: number,
  batchSize = 10,
): Promise<void> {
  for (let i = 0; i < count; i += batchSize) {
    await Promise.all(
      Array.from({ length: Math.min(batchSize, count - i) }, (_, j) => {
        const idx = (i + j) % POOL_SIZE;
        return placeOrder({
          userId: uid(idx),
          marketId: MARKET_ID,
          side: "SELL",
          outcome: "YES",
          price,
          quantity: QTY,
        }).catch(() => {});
      }),
    );
  }
}

// ─── 4. PHASE 1 — MICROBENCHMARK (in-memory, no DB) ─────────────────────

function phase1Microbenchmark() {
  console.log("\n═══ Phase 1: Microbenchmark (in-memory, no DB) ═══\n");

  const sizes = [100, 1_000, 5_000];
  const ITER = 1_000;

  for (const size of sizes) {
    const book = new OrderBook();
    const now = Date.now();

    for (let i = 0; i < size; i++) {
      book.insert({
        id: `o${i}`, userId: "u", marketId: MARKET_ID,
        side: "SELL", outcome: "YES", price: 60,
        normalizedSide: "SELL", normalizedPrice: 60,
        remaining: QTY, createdAt: new Date(now + i), version: 0,
      } as EngineOrder);
    }

    // non-matching: BUY at 50 vs SELL at 60 → empty result
    let t0 = performance.now();
    for (let k = 0; k < ITER; k++) book.getCandidates(true, PRICE);
    console.log(`  [${size}] getCandidates (no match):  ${((performance.now() - t0) / ITER).toFixed(4)} ms`);

    // matching all: BUY at 60 vs SELL at 60 → all pass filter
    t0 = performance.now();
    for (let k = 0; k < ITER; k++) book.getCandidates(true, 60);
    console.log(`  [${size}] getCandidates (match):     ${((performance.now() - t0) / ITER).toFixed(4)} ms`);

    // remove × 100 (simulates matched-maker cleanup)
    const LOOP = Math.min(100, size);
    t0 = performance.now();
    for (let k = 0; k < LOOP; k++) book.remove(`o${k}`, "SELL");
    console.log(`  [${size}] remove × ${LOOP}:            ${((performance.now() - t0) / LOOP).toFixed(4)} ms ea\n`);
  }
}

// ─── 5. PHASE 2 — LATENCY AT DEPTH ──────────────────────────────────────

async function phase2LatencyAtDepth() {
  console.log("═══ Phase 2: Latency at depth (DB + matching engine) ═══\n");

  // Each depth level: N resting SELL at 60 + 35 matching SELL at 50
  // Measured: 30 BUY at 50 (each matches one SELL at 50)
  const depths = [100, 500];

  for (const depth of depths) {
    console.log(`--- Depth: ${depth} resting orders (engine=${ENGINE}) ---`);

    await cleanMarket();
    resetState();
    if (ENGINE === "heap") resetBooks();

    console.log(`  Seeding ${depth + 35} orders …`);
    const t0 = performance.now();
    await seedSellOrders(depth, 60);                   // resting
    await seedSellOrders(35, PRICE);                    // matching
    console.log(`  Seeded in ${((performance.now() - t0) / 1000).toFixed(1)} s`);

    if (ENGINE === "heap") {
      resetBooks();
      await hydrateAllBooks();
    }

    // warmup — 5 BUY (discard)
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        placeOrder({
          userId: uid(POOL_SIZE + i), marketId: MARKET_ID,
          side: "BUY", outcome: "YES", price: PRICE, quantity: QTY,
        }).catch(() => {}),
      ),
    );

    // re-seed matching orders consumed by warmup
    await seedSellOrders(5, PRICE);
    if (ENGINE === "heap") {
      resetBooks();
      await hydrateAllBooks();
    }

    // measured — 30 BUY
    const latencies: number[] = [];
    for (let i = 0; i < 30; i++) {
      const t = performance.now();
      await placeOrder({
        userId: uid(POOL_SIZE + 10 + i), marketId: MARKET_ID,
        side: "BUY", outcome: "YES", price: PRICE, quantity: QTY,
      }).catch(() => {});
      latencies.push(performance.now() - t);
    }

    report(`placeOrder depth=${depth}`, latencies);
    console.log();
  }
}

// ─── 6. PHASE 3 — CONCURRENT THROUGHPUT ─────────────────────────────────

async function phase3Concurrent() {
  console.log("═══ Phase 3: Concurrent throughput ═══\n");

  await cleanMarket();
  resetState();
  if (ENGINE === "heap") resetBooks();

  // 50 matching SELL + 200 resting SELL
  console.log("  Seeding 250 orders …");
  const t0 = performance.now();
  await seedSellOrders(200, 60);
  await seedSellOrders(50, PRICE);
  console.log(`  Seeded in ${((performance.now() - t0) / 1000).toFixed(1)} s`);

  if (ENGINE === "heap") {
    resetBooks();
    await hydrateAllBooks();
  }

  // warmup
  await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      placeOrder({
        userId: uid(POOL_SIZE + 50 + i), marketId: MARKET_ID,
        side: "BUY", outcome: "YES", price: PRICE, quantity: QTY,
      }).catch(() => {}),
    ),
  );

  // reseed consumed warmup matching orders
  await seedSellOrders(5, PRICE);
  if (ENGINE === "heap") {
    resetBooks();
    await hydrateAllBooks();
  }

  // 4 rounds of 10 concurrent BUY
  const rounds = 4;
  const concurrency = 10;
  const allTps: number[] = [];

  for (let r = 0; r < rounds; r++) {
    const baseIdx = POOL_SIZE + 60 + r * concurrency;
    const t0 = performance.now();

    await Promise.all(
      Array.from({ length: concurrency }, (_, i) =>
        placeOrder({
          userId: uid(baseIdx + i), marketId: MARKET_ID,
          side: "BUY", outcome: "YES", price: PRICE, quantity: QTY,
        }),
      ),
    );

    const elapsed = performance.now() - t0;
    const tps = (concurrency / (elapsed / 1000));
    allTps.push(tps);
    console.log(`  Round ${r + 1}: ${concurrency} orders in ${elapsed.toFixed(0)} ms → ${tps.toFixed(1)} orders/sec`);
  }

  console.log(`  ─── Average: ${(allTps.reduce((s, v) => s + v, 0) / allTps.length).toFixed(2)} orders/sec ───\n`);
}

// ─── 7. MAIN ─────────────────────────────────────────────────────────────

async function main() {
  const suiteStart = performance.now();
  console.log("=".repeat(56));
  console.log("  Consensus Benchmark Suite");
  console.log(`  Engine: ${ENGINE}`);
  console.log("=".repeat(56));

  try {
    await setup();

    phase1Microbenchmark();                    // runs on heap engine regardless

    if (ENGINE === "heap") resetBooks();
    await phase2LatencyAtDepth();
    await phase3Concurrent();

  } catch (err) {
    console.error("\n💥 Benchmark crashed:", err);
  } finally {
    console.log("🧹 Final cleanup …");
    await cleanEverything();
    console.log(`\nDone in ${((performance.now() - suiteStart) / 1000).toFixed(1)} s`);
  }
}

main();
