/**
 * Tracks the next tx nonce per address. Used by the transfer worker to send
 * multiple txs in quick succession without colliding on the same nonce.
 *
 * On first use for a given address, it fetches the on-chain nonce via the
 * supplied `fetchOnChainNonce` and caches it; subsequent reservations just
 * increment the cached counter.
 */
export type NonceFetcher = (address: string) => Promise<number>;

export class NonceManager {
  private nextNonce = new Map<string, number>();

  constructor(private readonly fetchOnChainNonce: NonceFetcher) {}

  async reserve(address: string): Promise<number> {
    const key = address.toLowerCase();
    let current = this.nextNonce.get(key);
    if (current === undefined) {
      current = await this.fetchOnChainNonce(key);
    }
    this.nextNonce.set(key, current + 1);
    return current;
  }
}
