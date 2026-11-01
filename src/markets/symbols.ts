// Compatibility for the two BSE scrip codes used in earlier app versions.
// TradingView's symbol search uses exchange-qualified trading tickers instead.
const previousSymbols = new Map([
  ["BSE:500209", "BSE:INFY"],
  ["BSE:500325", "BSE:RELIANCE"],
]);
export function canonicalStockSymbol(value: string) {
  const symbol = value.trim().toUpperCase();
  return previousSymbols.get(symbol) ?? symbol;
}
