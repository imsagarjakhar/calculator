import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export const currencies = [
  ["INR", "₹"],
  ["SAR", "ر.س"],
  ["USD", "$"],
  ["AED", "د.إ"],
  ["EUR", "€"],
  ["GBP", "£"],
] as const;
const key = "financial-planner-currency-v1";
const eventName = "planner-currency-change";
let memory: string | null = null;
const supported = (code: unknown): code is string =>
  typeof code === "string" && currencies.some(([c]) => c === code);

export function preferredCurrency(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(key);
    if (supported(saved)) return saved;
  } catch {
    /* Keep the session preference when storage is unavailable. */
  }
  return memory;
}
export function selectCurrency(code: string) {
  if (!supported(code) || preferredCurrency() === code) return;
  memory = code;
  try {
    localStorage.setItem(key, code);
  } catch {
    /* Session-only choice. */
  }
  window.dispatchEvent(new Event(eventName));
}
export function onCurrencyChange(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener();
  };
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", storage);
  };
}
export function useCurrency() {
  const [currency, setCurrency] = useState(() => preferredCurrency() ?? "INR");
  useEffect(
    () => onCurrencyChange(() => setCurrency(preferredCurrency() ?? "INR")),
    [],
  );
  return currency;
}
export function currencyMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
export function usePlanCurrency<T extends { currency: string }>(
  plan: T,
  setPlan: Dispatch<SetStateAction<T>>,
) {
  useEffect(
    () =>
      onCurrencyChange(() => {
        const currency = preferredCurrency();
        if (currency)
          setPlan((p) => (p.currency === currency ? p : { ...p, currency }));
      }),
    [setPlan],
  );
  useEffect(() => selectCurrency(plan.currency), [plan.currency]);
}
