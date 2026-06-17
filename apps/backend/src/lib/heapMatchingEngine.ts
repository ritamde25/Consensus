import { prisma, OrderSide, Outcome, OrderStatus, Prisma } from "db";

import type { PlaceOrderInput, PlaceOrderResult } from "../types/types";
import type { EngineOrder } from "../types/types";
import { OrderBook } from "../orderbook/orderbook";

type PlaceOrderParams = { userId: string } & PlaceOrderInput;

type TransactionClient = Prisma.TransactionClient;

const books = new Map<string, OrderBook>();

export async function hydrateAllBooks() {
  const openOrders = await prisma.order.findMany({
    where: { status: { in: ["OPEN", "PARTIAL"] } },
    orderBy: { createdAt: "asc" },
  });

  for (const o of openOrders) {
    let book = books.get(o.marketId);

    if (!book) {
      book = new OrderBook();
      books.set(o.marketId, book);
    }

    book.insert({
      id: o.id,
      userId: o.userId,
      marketId: o.marketId,
      side: o.side,
      outcome: o.outcome,
      price: o.price,
      normalizedSide: o.normalizedSide,
      normalizedPrice: o.normalizedPrice,
      remaining: o.remaining,
      createdAt: o.createdAt,
      version: 0,
    });
  }
}

function getBook(marketId: string) {
  if (!books.has(marketId)) {
    books.set(marketId, new OrderBook());
  }
  return books.get(marketId)!;
}

export function removeOrderFromBook(marketId: string, orderId: string, side: "BUY" | "SELL"): void {
  const book = getBook(marketId);
  book.remove(orderId, side);
}

const getNormalizedPrice = (outcome: Outcome, price: number) =>
  outcome === "YES" ? price : 100 - price;

function calculateOrderStatus(remaining: number, filled: number): OrderStatus {
  return remaining === 0 ? "FILLED" : filled > 0 ? "PARTIAL" : "OPEN";
}

export async function placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
  const { userId, marketId, side, outcome, price, quantity } = params;
  const normalizedPrice = getNormalizedPrice(outcome, price);

  if (price < 0 || price > 100) throw new Error("Price must be between 0 and 100 cents");
  if (quantity <= 0) throw new Error("Quantity must be positive");

  return prisma.$transaction(async (tx) => {
    const [user] = await tx.$queryRaw<any[]>`SELECT * FROM "User" WHERE id = ${userId} FOR UPDATE`;
    if (!user) throw new Error("User not found");

    const market = await tx.market.findUnique({ where: { id: marketId } });
    if (!market) throw new Error("Market not found");
    if (market.isResolved) throw new Error("Market already resolved");

    await tx.position.upsert({
      where: { userId_marketId: { userId, marketId } },
      update: {},
      create: { userId, marketId, yesShares: 0, noShares: 0, lockedYesShares: 0, lockedNoShares: 0, totalSpent: 0 },
    });

    const [position] =
      await tx.$queryRaw<any[]>`SELECT * FROM "Position" WHERE "userId" = ${userId} AND "marketId" = ${marketId} FOR UPDATE`;

    if (side === "BUY") {
      const required = price * quantity;
      if (user.usdBalance < required) throw new Error("Insufficient USD balance");
    } else {
      if (outcome === "YES" && position.yesShares < quantity) throw new Error("Insufficient YES shares");
      if (outcome === "NO"  && position.noShares  < quantity) throw new Error("Insufficient NO shares");
    }

    const normalizedSide = (outcome === "YES")? side : ( (side === "BUY")? "SELL" : "BUY" );

    return normalizedSide === "BUY"
      ? executeBuy(tx, params, normalizedPrice, marketId)
      : executeSell(tx, params, normalizedPrice, marketId);
  });
}

async function executeBuy(
  tx: TransactionClient, params: PlaceOrderParams, normalizedPrice: number, marketId: string,
): Promise<PlaceOrderResult> {
  const { userId, side, outcome, price, quantity } = params;
  const isBuyYes = outcome === "YES";
  const required = price * quantity;
  const book = getBook(marketId);

  isBuyYes?
  await tx.user.update({
    where: { id: userId },
    data: { usdBalance: { decrement: required }, lockedBalance: { increment: required } },
  }) :
  await tx.position.update({
    where: { userId_marketId: { userId, marketId } },
    data: { noShares: { decrement: quantity }, lockedNoShares: { increment: quantity } },
  });

  const order = await tx.order.create({
    data: { userId, marketId, side, outcome, price, normalizedSide: "BUY", normalizedPrice, quantity, remaining: quantity, status: "OPEN" },
  });

  const matchingOrders = book.getCandidates(true, normalizedPrice);

  let filledQty = 0;
  let totalAmount = 0;

  const trades: Prisma.TradeCreateManyInput[] = [];
  const makerOrderUpdates: { id: string; remaining: number; status: OrderStatus }[] = [];
  const makerBalanceUpdates: { userId: string; amount: number; isMakerSellYes: boolean }[] = [];
  const makerPositionUpdates: { userId: string; quantity: number; proceeds: number; isMakerSellYes: boolean }[] = [];

  for (const maker of matchingOrders) {
    if (filledQty >= quantity) break;
    const matchQty = Math.min(maker.remaining, quantity - filledQty);
    if (matchQty <= 0) continue;

    const makerProceeds = maker.price * matchQty;
    const newRemaining = maker.remaining - matchQty;

    const isMakerSellYes = maker.outcome === "YES";

    filledQty += matchQty;
    totalAmount += isBuyYes ? makerProceeds : 100 - makerProceeds;

    makerOrderUpdates.push({ id: maker.id, remaining: newRemaining, status: newRemaining === 0 ? "FILLED" : "PARTIAL" });
    makerBalanceUpdates.push({ userId: maker.userId, amount: makerProceeds, isMakerSellYes });
    makerPositionUpdates.push({ userId: maker.userId, quantity: matchQty, proceeds: makerProceeds, isMakerSellYes });
    trades.push({
      marketId, takerId: userId, makerId: maker.userId,
      quantity: matchQty, takerPrice: price, makerPrice: maker.price,
      takerOrderId: order.id, makerOrderId: maker.id,
      takerOutcome: outcome, makerOutcome: maker.outcome,
    });

    // Remove from orderbook if fully filled
    if (newRemaining === 0) {
      book.remove(maker.id, maker.side);
    } else {
      // Update remaining in orderbook by removing and reinserting
      book.remove(maker.id, maker.side);
      book.insert({
        ...maker,
        remaining: newRemaining,
      });
    }
  }

  if (trades.length > 0) tx.trade.createMany({ data: trades });

  await Promise.all(
    makerOrderUpdates.map(u =>
      tx.order.update({
        where: { id: u.id },
        data: { remaining: u.remaining, status: u.status },
      })
    )
  );

  await Promise.all(
    makerBalanceUpdates.map((u) =>
      u.isMakerSellYes
        ? tx.user.update({
            where: { id: u.userId },
            data: { usdBalance: { increment: u.amount } },
          })
        : tx.user.update({
            where: { id: u.userId },
            data: { lockedBalance: { decrement: u.amount } },
          })
    )
  );


  await Promise.all(
    makerPositionUpdates.map((u) =>
      tx.position.update({
        where: {
          userId_marketId: {
            userId: u.userId,
            marketId,
          },
        },
        data: u.isMakerSellYes
          ? {
              lockedYesShares: { decrement: u.quantity },
              totalSpent: { decrement: u.proceeds },
            }
          : {
              noShares: { increment: u.quantity },
              totalSpent: { increment: u.proceeds },
            },
      })
    )
  );

  const buyRefund = price * filledQty - totalAmount;
  const remaining = quantity - filledQty;
  const status = calculateOrderStatus(remaining, filledQty);

  isBuyYes
    ? await tx.user.update({
      where: { id: userId },
      data: { lockedBalance: { decrement: price * filledQty }, usdBalance: { increment: buyRefund } },
    })
    : await tx.user.update({
      where: { id: userId },
      data: { usdBalance: { increment: totalAmount } },
    });

  await tx.order.update({ where: { id: order.id }, data: { remaining, status } });

  await tx.position.update({
    where: { userId_marketId: { userId, marketId } },
    data: isBuyYes
      ? { yesShares: { increment: filledQty }, totalSpent: { increment: totalAmount } }
      : { lockedNoShares:  { decrement: filledQty }, totalSpent: { decrement: totalAmount } },
  });

  // Insert order into orderbook if not fully filled
  if (remaining > 0) {
    const engineOrder: EngineOrder = {
      id: order.id,
      userId,
      marketId,
      side,
      outcome,
      price,
      normalizedSide: "BUY",
      normalizedPrice,
      remaining,
      createdAt: order.createdAt,
      version: 0,
    };
    book.insert(engineOrder);
  }

  return { orderId: order.id, filledQuantity: filledQty, remainingQuantity: remaining, status, trades: trades.length };
}

async function executeSell(
  tx: TransactionClient, params: PlaceOrderParams, normalizedPrice: number, marketId: string,
): Promise<PlaceOrderResult> {
  const { userId, side, outcome, price, quantity } = params;
  const isSellYes = outcome === "YES";
  const required = price * quantity;
  const book = getBook(marketId);

  // Lock the shares being sold
  isSellYes?
  await tx.position.update({
    where: { userId_marketId: { userId, marketId } },
    data: { yesShares: { decrement: quantity }, lockedYesShares: { increment: quantity } },
  }) :
  await tx.user.update({
    where: { id: userId },
    data: { usdBalance: { decrement: required }, lockedBalance: { increment: required } },
  });

  const order = await tx.order.create({
    data: { userId, marketId, side, outcome, price, normalizedSide: "SELL", normalizedPrice, quantity, remaining: quantity, status: "OPEN" },
  });

  const matchingOrders = book.getCandidates(false, normalizedPrice);

  let filledQty = 0;
  let totalAmount = 0;

  const trades: Prisma.TradeCreateManyInput[] = [];
  const makerOrderUpdates: { id: string; remaining: number; status: OrderStatus }[] = [];
  const makerBalanceUpdates: { userId: string; amount: number; isMakerBuyYes: boolean }[] = [];
  const makerPositionUpdates: { userId: string; quantity: number; proceeds: number; isMakerBuyYes: boolean }[] = [];

  for (const maker of matchingOrders) {
    if (filledQty >= quantity) break;
    const matchQty = Math.min(maker.remaining, quantity - filledQty);
    if (matchQty <= 0) continue;

    const makerProceeds = maker.price * matchQty;
    const newRemaining = maker.remaining - matchQty;

    const isMakerBuyYes = maker.outcome === "YES";

    filledQty += matchQty;
    totalAmount += isSellYes? makerProceeds : 100 - makerProceeds;

    makerOrderUpdates.push({ id: maker.id, remaining: newRemaining, status: newRemaining === 0 ? "FILLED" : "PARTIAL" });
    makerBalanceUpdates.push({ userId: maker.userId, amount: makerProceeds, isMakerBuyYes });
    makerPositionUpdates.push({ userId: maker.userId, quantity: matchQty, proceeds: makerProceeds, isMakerBuyYes });
    trades.push({
      marketId, takerId: userId, makerId: maker.userId,
      quantity: matchQty, takerPrice: price, makerPrice: maker.price,
      takerOrderId: order.id, makerOrderId: maker.id,
      takerOutcome: outcome, makerOutcome: maker.outcome,
    });

    // Remove from orderbook if fully filled
    if (newRemaining === 0) {
      book.remove(maker.id, maker.side);
    } else {
      // Update remaining in orderbook by removing and reinserting
      book.remove(maker.id, maker.side);
      book.insert({
        ...maker,
        remaining: newRemaining,
      });
    }
  }

  if (trades.length > 0) await tx.trade.createMany({ data: trades });

  await Promise.all(
    makerOrderUpdates.map((u) =>
      tx.order.update({
        where: { id: u.id },
        data: { remaining: u.remaining, status: u.status },
      })
    )
  );
  
  await Promise.all(
    makerBalanceUpdates.map((u) =>
      u.isMakerBuyYes
        ? tx.user.update({
            where: { id: u.userId },
            data: { lockedBalance: { decrement: u.amount } },
          })
        : tx.user.update({
            where: { id: u.userId },
            data: { usdBalance: { increment: u.amount } },
          })
    )
  );
  
  await Promise.all(
    makerPositionUpdates.map((u) =>
      tx.position.update({
        where: {
          userId_marketId: {
            userId: u.userId,
            marketId,
          },
        },
        data: u.isMakerBuyYes
          ? {
              yesShares: { increment: u.quantity },
              totalSpent: { increment: u.proceeds },
            }
          : {
              lockedNoShares: { decrement: u.quantity },
              totalSpent: { decrement: u.proceeds },
            },
      })
    )
  );

  const buyRefund = price * filledQty - totalAmount;
  const remaining = quantity - filledQty;
  const status = calculateOrderStatus(remaining, filledQty);

  isSellYes
    ? await tx.user.update({
      where: { id: userId },
      data: { usdBalance: { increment: totalAmount }},
    })
    : await tx.user.update({
      where: { id: userId },
      data: { lockedBalance: { decrement: price * filledQty }, usdBalance: { increment: buyRefund } },
    });

  await tx.order.update({ where: { id: order.id }, data: { remaining, status } });

  await tx.position.update({
    where: { userId_marketId: { userId, marketId } },
    data: isSellYes
      ? { lockedYesShares: { decrement: filledQty }, totalSpent: { decrement: totalAmount } }
      : { noShares:  { increment: filledQty }, totalSpent: { increment: totalAmount } },
  });

  // Insert order into orderbook if not fully filled
  if (remaining > 0) {
    const engineOrder: EngineOrder = {
      id: order.id,
      userId,
      marketId,
      side,
      outcome,
      price,
      normalizedSide: "SELL",
      normalizedPrice,
      remaining,
      createdAt: order.createdAt,
      version: 0,
    };
    book.insert(engineOrder);
  }

  return { orderId: order.id, filledQuantity: filledQty, remainingQuantity: remaining, status, trades: trades.length };
}