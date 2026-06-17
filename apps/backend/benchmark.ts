import { performance } from "perf_hooks";
import { prisma } from "db";
import { placeOrder } from "./src/lib/heapMatchingEngine";

const MARKET_ID = "bench-market";
const USER_PREFIX = "bench_u";

const USERS = 200;
const QTY = 5;
const PRICE = 50;

const latencies: number[] = [];

// --------------------------------------------------
// 1. SETUP (FAIL SAFE)
// --------------------------------------------------

async function setup() {
  console.log("🧱 Setup starting...");

  try {
    await prisma.market.upsert({
      where: { id: MARKET_ID },
      update: {},
      create: {
        id: MARKET_ID,
        title: "Benchmark Market",
        description: "Perf test market",
        resolutionDeadline: new Date(Date.now() + 1000 * 60 * 60),
        isResolved: false,
      },
    });

    for (let i = 0; i < USERS; i++) {
      const userId = `${USER_PREFIX}${i}`;

      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          supabaseUid: `bench-${userId}`,
          usdBalance: 100000,
          lockedBalance: 0,
        },
      });

      await prisma.position.upsert({
        where: {
          userId_marketId: {
            userId,
            marketId: MARKET_ID,
          },
        },
        update: {},
        create: {
          userId,
          marketId: MARKET_ID,
          yesShares: 100,
          noShares: 100,
          lockedYesShares: 0,
          lockedNoShares: 0,
          totalSpent: 0,
        },
      });
    }

    console.log("✅ Setup complete");
  } catch (err) {
    console.error("❌ Setup failed:", err);
    throw err; // still propagate so cleanup runs
  }
}

// --------------------------------------------------
// 2. SEED
// --------------------------------------------------

async function seedLiquidity() {
  console.log("📦 Seeding...");

  for (let i = 0; i < USERS / 2; i++) {
    await placeOrder({
      userId: `${USER_PREFIX}${i}`,
      marketId: MARKET_ID,
      side: "SELL",
      outcome: "YES",
      price: PRICE,
      quantity: QTY,
    });
  }
}

// --------------------------------------------------
// 3. BENCHMARK
// --------------------------------------------------

async function runBenchmark() {
  console.log("⚡ Running benchmark...");

  const startAll = performance.now();

  for (let i = USERS / 2; i < USERS; i++) {
    const start = performance.now();

    await placeOrder({
      userId: `${USER_PREFIX}${i}`,
      marketId: MARKET_ID,
      side: "BUY",
      outcome: "YES",
      price: PRICE,
      quantity: QTY,
    });

    latencies.push(performance.now() - start);
  }

  const endAll = performance.now();

  const avg =
    latencies.reduce((a, b) => a + b, 0) / latencies.length;

  const sorted = [...latencies].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  const throughput =
    (USERS / 2) / ((endAll - startAll) / 1000);

  console.log("\n📊 RESULTS");
  console.log("----------------------");
  console.log(`Avg: ${avg.toFixed(2)} ms`);
  console.log(`P95: ${p95.toFixed(2)} ms`);
  console.log(`P99: ${p99.toFixed(2)} ms`);
  console.log(`TPS: ${throughput.toFixed(2)} orders/sec`);
}

// --------------------------------------------------
// 4. CLEANUP (FULLY ROBUST)
// --------------------------------------------------

async function cleanup() {
  console.log("\n🧹 Cleanup starting...");

  const tasks = [
    prisma.trade.deleteMany({ where: { marketId: MARKET_ID } }),
    prisma.order.deleteMany({ where: { marketId: MARKET_ID } }),
    prisma.position.deleteMany({ where: { marketId: MARKET_ID } }),
    prisma.market.deleteMany({ where: { id: MARKET_ID } }),
    prisma.user.deleteMany({
      where: { supabaseUid: { startsWith: "bench-" } },
    }),
  ];

  const results = await Promise.allSettled(tasks);

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.warn(`⚠️ cleanup task ${i} failed:`, r.reason);
    }
  });

  console.log("✅ Cleanup finished (best effort)");
}

// --------------------------------------------------
// 5. MAIN (CRASH-PROOF ORCHESTRATION)
// --------------------------------------------------

async function main() {
  try {
    await setup();
    await seedLiquidity();
    await runBenchmark();
  } catch (err) {
    console.error("💥 Benchmark crashed:", err);
  } finally {
    await cleanup();
  }
}

main();