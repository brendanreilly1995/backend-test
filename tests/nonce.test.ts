import { NonceManager } from "../src/services/nonce.service";
import { deferred } from "./helpers/fixtures";

describe("NonceManager", () => {
  describe("sequential reservations", () => {
    it("returns sequential nonces starting from the on-chain value", async () => {
      const mgr = new NonceManager(async () => 7);
      expect(await mgr.reserve("0xabc")).toBe(7);
      expect(await mgr.reserve("0xabc")).toBe(8);
      expect(await mgr.reserve("0xabc")).toBe(9);
    });

    it("fetches the on-chain nonce only once per address", async () => {
      const fetcher = jest.fn(async () => 42);
      const mgr = new NonceManager(fetcher);
      await mgr.reserve("0xabc");
      await mgr.reserve("0xabc");
      await mgr.reserve("0xabc");
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("tracks nonces per address independently", async () => {
      const mgr = new NonceManager(async (addr) => (addr === "0xaaa" ? 1 : 100));
      expect(await mgr.reserve("0xaaa")).toBe(1);
      expect(await mgr.reserve("0xbbb")).toBe(100);
      expect(await mgr.reserve("0xaaa")).toBe(2);
      expect(await mgr.reserve("0xbbb")).toBe(101);
    });

    it("treats differently-cased addresses as the same account", async () => {
      const fetcher = jest.fn(async () => 5);
      const mgr = new NonceManager(fetcher);
      expect(await mgr.reserve("0xABCDEF0000000000000000000000000000000000")).toBe(5);
      expect(await mgr.reserve("0xabcdef0000000000000000000000000000000000")).toBe(6);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe("concurrent reservations", () => {
    // The classic check-then-act race: every concurrent caller observes
    // `current === undefined` before any of them writes back, so each fetches
    // the chain nonce and they all return the same value.
    it("hands out unique, contiguous nonces for 3 racing reservations", async () => {
      const fetcher = jest.fn(async () => 10);
      const mgr = new NonceManager(fetcher);

      const nonces = await Promise.all([
        mgr.reserve("0xabc"),
        mgr.reserve("0xabc"),
        mgr.reserve("0xabc"),
      ]);

      expect(new Set(nonces).size).toBe(3);
      expect([...nonces].sort((a, b) => a - b)).toEqual([10, 11, 12]);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("scales to 100 concurrent reservations without collisions", async () => {
      const fetcher = jest.fn(async () => 0);
      const mgr = new NonceManager(fetcher);

      const nonces = await Promise.all(
        Array.from({ length: 100 }, () => mgr.reserve("0xwhale")),
      );

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(new Set(nonces).size).toBe(100);
      expect([...nonces].sort((a, b) => a - b)).toEqual(
        Array.from({ length: 100 }, (_, i) => i),
      );
    });

    it("dedupes the on-chain fetch even when callers race the in-flight read", async () => {
      // Hold the fetch open so all reservations pile up behind a single
      // unresolved promise, then release it.
      const gate = deferred<void>();
      const fetcher = jest.fn(async () => {
        await gate.promise;
        return 100;
      });
      const mgr = new NonceManager(fetcher);

      const pending = Array.from({ length: 8 }, () => mgr.reserve("0xabc"));
      await Promise.resolve();
      gate.resolve();
      const nonces = await Promise.all(pending);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(new Set(nonces).size).toBe(8);
      expect([...nonces].sort((a, b) => a - b)).toEqual([
        100, 101, 102, 103, 104, 105, 106, 107,
      ]);
    });

    it("isolates per-address counters under interleaved concurrent load", async () => {
      const mgr = new NonceManager(async (addr) =>
        addr === "0xaaa" ? 0 : 1000,
      );

      const tasks: Array<Promise<number>> = [];
      for (let i = 0; i < 10; i++) {
        tasks.push(mgr.reserve("0xaaa"));
        tasks.push(mgr.reserve("0xbbb"));
      }
      const all = await Promise.all(tasks);

      const a = all.filter((n) => n < 1000).sort((x, y) => x - y);
      const b = all.filter((n) => n >= 1000).sort((x, y) => x - y);
      expect(a).toEqual(Array.from({ length: 10 }, (_, i) => i));
      expect(b).toEqual(Array.from({ length: 10 }, (_, i) => 1000 + i));
    });
  });

  describe("resilience", () => {
    it("propagates a failed on-chain fetch without wedging the address", async () => {
      let attempt = 0;
      const fetcher = jest.fn(async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("rpc timeout");
        return 5;
      });
      const mgr = new NonceManager(fetcher);

      await expect(mgr.reserve("0xabc")).rejects.toThrow(/rpc timeout/);
      // A transient RPC failure must not permanently poison the address: a
      // subsequent reservation re-fetches and proceeds cleanly.
      expect(await mgr.reserve("0xabc")).toBe(5);
      expect(await mgr.reserve("0xabc")).toBe(6);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });
});
