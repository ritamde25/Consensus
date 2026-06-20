import { Heap } from "./heap";
import type { EngineOrder } from "../types/types";

export class OrderBook {
  private bids = new Heap<EngineOrder>((a, b) =>
    a.value.normalizedPrice > b.value.normalizedPrice ||
    (a.value.normalizedPrice === b.value.normalizedPrice &&
      a.value.createdAt.getTime() < b.value.createdAt.getTime())
  );

  private asks = new Heap<EngineOrder>((a, b) =>
    a.value.normalizedPrice < b.value.normalizedPrice ||
    (a.value.normalizedPrice === b.value.normalizedPrice &&
      a.value.createdAt.getTime() < b.value.createdAt.getTime())
  );

  private deletedIds = new Set<string>();

  insert(order: EngineOrder) {
    const node = {
      key: order.normalizedPrice,
      time: order.createdAt.getTime(),
      value: order,
    };

    this.deletedIds.delete(order.id);

    order.normalizedSide === "BUY"
      ? this.bids.insert(node)
      : this.asks.insert(node);
  }

  getCandidates(isBuy: boolean, limitPrice: number): EngineOrder[] {
    const heap = isBuy ? this.asks : this.bids;

    return heap.toSortedSlice(
      (n) =>
        !this.deletedIds.has(n.value.id) &&
        (isBuy
          ? n.value.normalizedPrice <= limitPrice
          : n.value.normalizedPrice >= limitPrice)
    );
  }

  remove(orderId: string, _side: "BUY" | "SELL"): void {
    this.deletedIds.add(orderId);
  }
}