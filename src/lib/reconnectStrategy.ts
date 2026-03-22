export type ReconnectConfig = {
  baseMs?: number;
  maxMs?: number;
  maxAttempts?: number;
  jitterMs?: number;
};

export type ReconnectState = {
  readonly attempt: number;
  nextDelay: () => number;
  reset: () => void;
  canRetry: () => boolean;
};

export function createReconnectStrategy(config?: ReconnectConfig): ReconnectState {
  const base = config?.baseMs ?? 1000;
  const max = config?.maxMs ?? 30000;
  const maxAttempts = config?.maxAttempts ?? 10;
  const jitter = config?.jitterMs ?? 500;
  let attempt = 0;

  return {
    get attempt() { return attempt; },
    nextDelay() {
      const delay = Math.min(base * Math.pow(2, attempt), max) + Math.random() * jitter;
      attempt++;
      return delay;
    },
    reset() { attempt = 0; },
    canRetry() { return maxAttempts === 0 || attempt < maxAttempts; },
  };
}
