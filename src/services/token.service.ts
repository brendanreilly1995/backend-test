export interface TokenMeta {
  symbol: string;
  decimals: number;
  address: string;
}

export const KNOWN_TOKENS: Record<string, TokenMeta> = {
  ETH: { symbol: "ETH", decimals: 18, address: "0x0000000000000000000000000000000000000000" },
  USDC: { symbol: "USDC", decimals: 6, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  USDT: { symbol: "USDT", decimals: 6, address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
  WBTC: { symbol: "WBTC", decimals: 8, address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" },
  DAI:  { symbol: "DAI",  decimals: 18, address: "0x6B175474E89094C44Da98b954EedeAC495271d0F" },
};

export function getTokenMeta(symbol: string): TokenMeta {
  const meta = KNOWN_TOKENS[symbol.toUpperCase()];
  if (!meta) throw new Error(`Unknown token: ${symbol}`);
  return meta;
}
