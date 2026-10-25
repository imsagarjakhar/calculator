import type { LoanAsset } from "./model.ts";

export const netRent = (asset: LoanAsset, month = 1) =>
  asset.rent *
    Math.pow(1 + asset.rentGrowth / 100, (month - 1) / 12) *
    (1 - asset.vacancy / 100) -
  asset.costs;

// A budget containing today's rent already includes its initial net amount.
// Future changes still affect funding, even for an included rental asset.
export const additionalRentalFunding = (assets: LoanAsset[], month = 1) =>
  assets.reduce(
    (sum, asset) =>
      sum + netRent(asset, month) - (asset.rentIncluded ? netRent(asset) : 0),
    0,
  );

export const assetValueAt = (assets: LoanAsset[], month = 0) =>
  assets.reduce(
    (sum, asset) =>
      sum + asset.value * Math.pow(1 + asset.appreciation / 100, month / 12),
    0,
  );

/** Current annual income divided by current asset value; excludes price growth. */
export function assetIncomeYield(asset: LoanAsset) {
  if (!Number.isFinite(asset.value) || asset.value <= 0)
    return { gross: null, net: null };
  return {
    gross: ((asset.rent * 12) / asset.value) * 100,
    net: ((netRent(asset) * 12) / asset.value) * 100,
  };
}
