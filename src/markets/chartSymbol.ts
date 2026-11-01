import { normaliseSymbol } from "./watchlists.ts";

export type ChartStock = { symbol: string; description: string };
const origin = "https://www.tradingview-widget.com";

// The embedded widget currently exposes this request/reply bridge. It is not
// a guaranteed public API: fail closed if the provider changes it. Never use
// the initial iframe symbol, since native chart searches can change that stock.
export function readChartStock(frame: HTMLIFrameElement): Promise<ChartStock> {
  return new Promise((resolve, reject) => {
    const target = frame.contentWindow;
    if (!target || !frame.isConnected || new URL(frame.src).origin !== origin) {
      reject(new Error("Open a stock in the chart first."));
      return;
    }
    const client = crypto.randomUUID();
    const id = 1;
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("message", receive);
      frame.removeEventListener("load", changed);
    };
    const fail = () => {
      cleanup();
      reject(
        new Error(
          "Could not read the chart stock. Wait for its price to load, then try the bookmark again.",
        ),
      );
    };
    const changed = () => fail();
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== origin ||
        event.source !== target ||
        typeof event.data !== "string" ||
        event.data.length > 10000
      )
        return;
      let reply;
      try {
        reply = JSON.parse(event.data);
      } catch {
        return;
      }
      if (
        !reply ||
        reply.provider !== "TradingView" ||
        reply.client_id !== client ||
        reply.id !== id ||
        reply.type !== "on" ||
        reply.name !== "symbolInfo"
      )
        return;
      try {
        if (!frame.isConnected || frame.contentWindow !== target)
          throw new Error();
        const info = reply.data;
        if (
          !info ||
          typeof info.name !== "string" ||
          typeof info.exchange !== "string" ||
          typeof info.description !== "string" ||
          info.description.length > 300
        )
          throw new Error();
        const symbol = normaliseSymbol(`${info.exchange}:${info.name}`);
        cleanup();
        resolve({ symbol, description: info.description });
      } catch {
        fail();
      }
    };
    const timer = window.setTimeout(fail, 6000);
    window.addEventListener("message", receive);
    frame.addEventListener("load", changed, { once: true });
    target.postMessage(
      JSON.stringify({
        id,
        type: "get",
        name: "symbolInfo",
        client_id: client,
        data: null,
        provider: "TradingView",
      }),
      origin,
    );
  });
}
