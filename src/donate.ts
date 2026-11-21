/**
 * Addresses shown in the "What's new" page. The section is hidden while the list is empty.
 * Keep these in sync with the README so people can compare.
 */
export interface Donation {
  /** `Bitcoin`, `Ethereum` … */
  coin: string;
  /** Network the address is for: `BTC`, `ERC-20`, `TRC-20` … */
  network: string;
  address: string;
}

export const DONATIONS: Donation[] = [];
