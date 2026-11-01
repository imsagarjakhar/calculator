import { test } from "node:test";
import assert from "node:assert/strict";
import { readChartStock } from "../src/markets/chartSymbol.ts";

const origin = "https://www.tradingview-widget.com";
test("chart bookmark bridge verifies replies and fails without a current symbol", async (t) => {
  const previous = globalThis.window;
  const bus = new EventTarget();
  bus.setTimeout = (callback) => setTimeout(callback, 30);
  globalThis.window = bus;
  function fixture(respond) {
    const frame = new EventTarget();
    frame.src = origin + "/embed-widget/advanced-chart/";
    frame.isConnected = true;
    const target = { postMessage(raw, destination) {
      assert.equal(destination, origin);
      const request = JSON.parse(raw);
      queueMicrotask(() => respond(request, send, frame));
    }};
    frame.contentWindow = target;
    function send(request, overrides = {}, eventOverrides = {}) {
      const event = new Event("message");
      Object.assign(event, {
        origin, source: target,
        data: JSON.stringify({ ...request, type: "on", data: { name: "INFY", exchange: "BSE", description: "Infosys Limited" }, ...overrides }),
        ...eventOverrides,
      });
      bus.dispatchEvent(event);
    }
    return frame;
  }
  try {
    await t.test("ignores spoofed origins, sources and request identifiers", async () => {
      const frame = fixture((request, send) => {
        const wrong = {data: {name:"WRONG",exchange:"NASDAQ",description:"Wrong"}};
        send(request, wrong, {origin:"https://example.com"});
        send(request, wrong, {source:{}});
        send(request, {...wrong, client_id:"other"});
        send(request, {...wrong, id:2});
        send(request, {...wrong, provider:"other"});
        send(request);
      });
      assert.deepEqual(await readChartStock(frame), {symbol:"BSE:INFY", description:"Infosys Limited"});
    });
    await t.test("rejects malformed symbols instead of using the initial chart symbol", async () => {
      const frame = fixture((request, send) => send(request, {data:{name:"INFY",exchange:"",description:"Infosys"}}));
      await assert.rejects(readChartStock(frame), /Could not read/);
    });
    await t.test("rejects a removed or reloaded frame", async () => {
      const frame = fixture((request, send, node) => {node.isConnected=false; send(request);});
      await assert.rejects(readChartStock(frame), /Could not read/);
      const reload = fixture((request, send, node) => node.dispatchEvent(new Event("load")));
      await assert.rejects(readChartStock(reload), /Could not read/);
    });
    await t.test("times out if provider does not support the bridge", async () => {
      await assert.rejects(readChartStock(fixture(() => {})), /Could not read/);
    });
  } finally { globalThis.window = previous; }
});
