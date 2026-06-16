import { formatTokenAmount, sumAmounts } from "../src/utils/format";

describe("formatTokenAmount", () => {
  it.each<[string, bigint, number, string]>([
    ["1 ETH (18 dp)", 10n ** 18n, 18, "1.0"],
    ["1 USDC (6 dp)", 1_000_000n, 6, "1.0"],
    ["1 WBTC (8 dp)", 100_000_000n, 8, "1.0"],
    ["fractional USDC", 1_500_000n, 6, "1.5"],
    ["half an ETH", 5n * 10n ** 17n, 18, "0.5"],
    ["zero", 0n, 6, "0.0"],
    ["one wei", 1n, 18, "0.000000000000000001"],
    ["one USDC base unit", 1n, 6, "0.000001"],
    ["zero-decimal token", 42n, 0, "42"],
    ["8-dp precision retained", 123_456_789n, 8, "1.23456789"],
  ])("formats %s", (_label, amount, decimals, expected) => {
    expect(formatTokenAmount(amount, decimals)).toBe(expected);
  });

  it("honours the decimals argument instead of assuming 18", () => {
    // The same raw integer must format differently per token. A function that
    // ignores `decimals` and hardcodes 18 collapses these into one value.
    expect(formatTokenAmount(1_000_000n, 6)).toBe("1.0");
    expect(formatTokenAmount(1_000_000n, 18)).toBe("0.000000000001");
    expect(formatTokenAmount(1_000_000n, 6)).not.toBe(
      formatTokenAmount(1_000_000n, 18),
    );
  });

  it("formats a near-max-uint256 balance without loss", () => {
    const max = 2n ** 256n - 1n;
    expect(formatTokenAmount(max, 18)).toBe(
      "115792089237316195423570985008687907853269984665640564039457" +
        ".584007913129639935",
    );
  });
});

describe("sumAmounts", () => {
  it("returns 0n on empty input", () => {
    const total = sumAmounts([]);
    expect(typeof total).toBe("bigint");
    expect(total).toBe(0n);
  });

  it("sums a single element", () => {
    expect(sumAmounts([42n])).toBe(42n);
  });

  it("sums small amounts", () => {
    expect(sumAmounts([1n, 2n, 3n])).toBe(6n);
  });

  it("preserves precision exactly at the 2^53 boundary", () => {
    // Number(2^53) and Number(2^53 + 1) are indistinguishable as IEEE-754
    // doubles. A bigint sum must keep them apart.
    const result = sumAmounts([2n ** 53n, 1n]);
    expect(result).toBe(2n ** 53n + 1n);
    expect(result).not.toBe(2n ** 53n);
  });

  it("preserves precision across many whale balances", () => {
    const wei = 10n ** 18n;
    const balances = Array.from({ length: 50 }, () => 10_000_000n * wei);
    const expected = 50n * 10_000_000n * wei;
    expect(sumAmounts(balances)).toBe(expected);
  });

  it("does not overflow or round on values far beyond Number.MAX_SAFE_INTEGER", () => {
    const a = 123_456_789_123_456_789_123_456_789n;
    const b = 987_654_321_987_654_321_987_654_321n;
    expect(sumAmounts([a, b])).toBe(a + b);
  });
});
