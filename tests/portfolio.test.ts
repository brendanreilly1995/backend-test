import { valuePortfolio, totalForToken } from "../src/services/portfolio";

describe("valuePortfolio", () => {
  it("values a single ETH holding using human units, not raw wei", () => {
    // 1 ETH = 1e18 wei. Pricing the *raw* integer (1e18 * 3500) instead of the
    // human amount (1 * 3500) overstates the value by 18 orders of magnitude.
    const out = valuePortfolio([{ symbol: "ETH", amount: 10n ** 18n }], {
      ETH: 3500,
    });
    expect(out.totalUsd).toBe("3500.00");
    expect(out.breakdown).toEqual([
      { symbol: "ETH", amountHuman: "1.0", usd: "3500.00" },
    ]);
  });

  it("values a USDC holding using the token's real decimals", () => {
    const out = valuePortfolio([{ symbol: "USDC", amount: 1_000_000_000n }], {
      USDC: 1,
    });
    expect(out.totalUsd).toBe("1000.00");
    expect(out.breakdown[0].amountHuman).toBe("1000.0");
    expect(out.breakdown[0].usd).toBe("1000.00");
  });

  it("values a fractional holding", () => {
    const out = valuePortfolio([{ symbol: "ETH", amount: 5n * 10n ** 17n }], {
      ETH: 4000,
    });
    expect(out.totalUsd).toBe("2000.00");
  });

  it("values a mixed multi-token portfolio and preserves breakdown order", () => {
    const out = valuePortfolio(
      [
        { symbol: "ETH", amount: 2n * 10n ** 18n }, // 2 ETH
        { symbol: "USDC", amount: 500_000_000n }, // 500 USDC
        { symbol: "WBTC", amount: 25_000_000n }, // 0.25 WBTC
      ],
      { ETH: 3500, USDC: 1, WBTC: 60000 },
    );
    // 7000 + 500 + 15000
    expect(out.totalUsd).toBe("22500.00");
    expect(out.breakdown.map((b) => b.symbol)).toEqual(["ETH", "USDC", "WBTC"]);
    expect(out.breakdown.map((b) => b.usd)).toEqual([
      "7000.00",
      "500.00",
      "15000.00",
    ]);
  });

  it("returns a zero total and empty breakdown for an empty portfolio", () => {
    const out = valuePortfolio([], {});
    expect(out.totalUsd).toBe("0.00");
    expect(out.breakdown).toEqual([]);
  });

  it("resolves token symbols case-insensitively to canonical form", () => {
    const out = valuePortfolio([{ symbol: "eth", amount: 10n ** 18n }], {
      ETH: 3500,
    });
    expect(out.breakdown[0].symbol).toBe("ETH");
    expect(out.totalUsd).toBe("3500.00");
  });

  it("throws when a holding references an unknown token", () => {
    expect(() =>
      valuePortfolio([{ symbol: "DOGE", amount: 1n }], { DOGE: 1 }),
    ).toThrow(/unknown token/i);
  });

  it("throws when a price is missing for a held token", () => {
    expect(() =>
      valuePortfolio([{ symbol: "ETH", amount: 10n ** 18n }], { USDC: 1 }),
    ).toThrow(/no price/i);
  });
});

describe("totalForToken", () => {
  it("sums small balances", () => {
    expect(totalForToken([100n, 200n, 300n])).toBe(600n);
  });

  it("preserves precision across many whale wallets", () => {
    const wei = 10n ** 18n;
    const balances = Array(5).fill(1_000_000n * wei);
    expect(totalForToken(balances)).toBe(5_000_000n * wei);
  });

  it("distinguishes 2^53 from 2^53 + 1", () => {
    expect(totalForToken([2n ** 53n, 1n])).toBe(2n ** 53n + 1n);
  });
});
