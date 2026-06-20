export type HeapNode<T> = Readonly<{
  key: number;
  time: number;
  value: T;
}>;

export type HeapComparator<T> = (
  a: HeapNode<T>,
  b: HeapNode<T>
) => boolean;

export class Heap<T> {
  private data: HeapNode<T>[] = [];

  constructor(private readonly comparator: HeapComparator<T>) {}

  insert(node: HeapNode<T>): void {
    this.data.push(node);
    this.bubbleUp(this.data.length - 1);
  }

  peek(): HeapNode<T> | undefined {
    return this.data[0];
  }

  pop(): HeapNode<T> | undefined {
    if (this.data.length === 0) return undefined;

    const top = this.data[0];
    const last = this.data.pop();

    if (this.data.length === 0) return top;

    if (last !== undefined) {
      this.data[0] = last;
      this.sinkDown(0);
    }

    return top;
  }

  toSortedArray(): HeapNode<T>[] {
    const copy = new Heap<T>(this.comparator);

    for (const n of this.data) {
      copy.insert(n);
    }

    const out: HeapNode<T>[] = [];

    while (true) {
      const v = copy.pop();
      if (v === undefined) break;
      out.push(v);
    }

    return out;
  }

  toSortedSlice(predicate: (node: HeapNode<T>) => boolean): T[] {
    return this.data
      .filter(predicate)
      .sort((a, b) => {
        if (this.comparator(a, b)) return -1;
        if (this.comparator(b, a)) return 1;
        return 0;
      })
      .map((n) => n.value);
  }

  private bubbleUp(i: number): void {
    const node = this.data[i];

    while (i > 0) {
      const parentIndex = (i - 1) >> 1;
      const parent = this.data[parentIndex];

      if (!parent) break;

      // if parent already has higher priority, stop
      if (!this.comparator(node!, parent)) break;

      this.data[i] = parent;
      i = parentIndex;
    }

    this.data[i] = node!;
  }

  private sinkDown(i: number): void {
    const length = this.data.length;
    const node = this.data[i];

    while (true) {
      const left = i * 2 + 1;
      const right = i * 2 + 2;

      let swapIndex: number | null = null;

      if (left < length && this.data[left] && this.comparator(this.data[left], node!)) {
        swapIndex = left;
      }

      if (
        right < length &&
        this.data[right] &&
        this.comparator(
          this.data[right],
          swapIndex === null ? node! : this.data[left]!
        )
      ) {
        swapIndex = right;
      }

      if (swapIndex === null) break;

      this.data[i] = this.data[swapIndex]!;
      i = swapIndex;
    }

    this.data[i] = node!;
  }
}