import type { QueueItem } from "@mediaforge/shared";

interface GuildQueueState {
  current?: QueueItem;
  items: QueueItem[];
  paused: boolean;
}

export class QueueManager {
  private readonly queues = new Map<string, GuildQueueState>();

  enqueue(guildId: string, item: QueueItem): number {
    const state = this.getOrCreateState(guildId);
    state.items.push(item);
    return state.items.length;
  }

  getQueue(guildId: string): QueueItem[] {
    return [...this.getOrCreateState(guildId).items];
  }

  getCurrent(guildId: string): QueueItem | undefined {
    return this.getOrCreateState(guildId).current;
  }

  dequeue(guildId: string): QueueItem | undefined {
    return this.getOrCreateState(guildId).items.shift();
  }

  clear(guildId: string): QueueItem[] {
    const state = this.getOrCreateState(guildId);
    const clearedItems = [
      ...(state.current ? [state.current] : []),
      ...state.items
    ];

    state.current = undefined;
    state.items = [];
    state.paused = false;

    return clearedItems;
  }

  skip(guildId: string): QueueItem | undefined {
    const state = this.getOrCreateState(guildId);
    const skipped = state.current;
    state.current = undefined;
    state.paused = false;
    return skipped;
  }

  setCurrent(guildId: string, item: QueueItem | undefined): void {
    const state = this.getOrCreateState(guildId);
    state.current = item;
  }

  setPaused(guildId: string, paused: boolean): void {
    this.getOrCreateState(guildId).paused = paused;
  }

  isPaused(guildId: string): boolean {
    return this.getOrCreateState(guildId).paused;
  }

  getQueuePosition(guildId: string, itemId: string): number {
    const state = this.getOrCreateState(guildId);
    return state.items.findIndex((item) => item.id === itemId) + 1;
  }

  private getOrCreateState(guildId: string): GuildQueueState {
    const existing = this.queues.get(guildId);

    if (existing) {
      return existing;
    }

    const state: GuildQueueState = {
      items: [],
      paused: false
    };
    this.queues.set(guildId, state);
    return state;
  }
}
