import type { BalanceReader } from "../../src/routes/api";

/**
 * Canonical EIP-55 checksummed mainnet addresses, used as deterministic
 * fixtures across the suite. These are the *correct* checksum forms — any
 * single-character case flip makes them invalid.
 */
export const ADDR = {
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
} as const;

export const lower = (a: string) => a.toLowerCase();
export const upper = (a: string) => "0x" + a.slice(2).toUpperCase();

/** USDC address with exactly one nibble's case flipped → invalid EIP-55. */
export const BAD_CHECKSUM = "0xA0B86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
/** 42 chars, 0x-prefixed, but contains a non-hex 'Z'. */
export const NON_HEX = "0xZ0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

/**
 * A manually-resolvable promise. Lets a test hold an async call open at a
 * known point (e.g. an in-flight RPC) and release it deterministically,
 * with no timers or arbitrary sleeps.
 */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * A BalanceReader that records every call. Lets tests assert *what* the route
 * passed to `balanceOf` — in particular that the token symbol was resolved to
 * its on-chain contract address before the read.
 */
export function recordingReader(balance: bigint) {
  const calls: Array<{ token: string; owner: string }> = [];
  const reader: BalanceReader = {
    async balanceOf(token, owner) {
      calls.push({ token, owner });
      return balance;
    },
  };
  return { reader, calls };
}

/** A BalanceReader whose `balanceOf` always rejects, simulating an RPC outage. */
export function throwingReader(message = "RPC down"): BalanceReader {
  return {
    async balanceOf() {
      throw new Error(message);
    },
  };
}
