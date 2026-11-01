// Amounts never leave the browser. Only the two public currency codes are sent.
export const exchangeApi = "https://api.frankfurter.dev";
export const exchangeCurrencies = [
  ["INR", "Indian rupee"],
  ["SAR", "Saudi riyal"],
  ["USD", "US dollar"],
  ["AED", "UAE dirham"],
  ["EUR", "Euro"],
  ["GBP", "British pound"],
  ["AUD", "Australian dollar"],
  ["CAD", "Canadian dollar"],
  ["CHF", "Swiss franc"],
  ["CNY", "Chinese yuan"],
  ["JPY", "Japanese yen"],
  ["SGD", "Singapore dollar"],
  ["NZD", "New Zealand dollar"],
  ["HKD", "Hong Kong dollar"],
  ["QAR", "Qatari riyal"],
  ["KWD", "Kuwaiti dinar"],
  ["BHD", "Bahraini dinar"],
  ["OMR", "Omani rial"],
  ["PKR", "Pakistani rupee"],
  ["BDT", "Bangladeshi taka"],
  ["NPR", "Nepalese rupee"],
  ["LKR", "Sri Lankan rupee"],
  ["PHP", "Philippine peso"],
  ["IDR", "Indonesian rupiah"],
  ["MYR", "Malaysian ringgit"],
  ["THB", "Thai baht"],
  ["ZAR", "South African rand"],
  ["BRL", "Brazilian real"],
  ["MXN", "Mexican peso"],
  ["TRY", "Turkish lira"],
  ["SEK", "Swedish krona"],
  ["NOK", "Norwegian krone"],
] as const;
export type ExchangeRate = {
  base: string;
  quote: string;
  rate: number;
  date: string;
};
const supported = (code: string) =>
  exchangeCurrencies.some(([c]) => c === code);

export function parseExchangeRate(
  data: unknown,
  base: string,
  quote: string,
): ExchangeRate {
  const d = data as Partial<ExchangeRate> | null;
  if (
    !d ||
    typeof d.base !== "string" ||
    d.base.toUpperCase() !== base ||
    typeof d.quote !== "string" ||
    d.quote.toUpperCase() !== quote ||
    typeof d.rate !== "number" ||
    !Number.isFinite(d.rate) ||
    d.rate <= 0 ||
    typeof d.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
    !Number.isFinite(Date.parse(d.date + "T00:00:00Z"))
  ) {
    throw new Error(
      "The rate provider returned an invalid rate. Please try again.",
    );
  }
  return { base, quote, rate: d.rate, date: d.date };
}

export async function fetchExchangeRate(
  base: string,
  quote: string,
  signal: AbortSignal,
): Promise<ExchangeRate> {
  if (!supported(base) || !supported(quote) || base === quote)
    throw new Error("Choose two supported currencies.");
  const response = await fetch(`${exchangeApi}/v2/rate/${base}/${quote}`, {
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("Rates are unavailable right now. Please try again.");
  return parseExchangeRate(await response.json(), base, quote);
}
