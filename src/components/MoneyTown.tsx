import { useEffect, useRef } from "react";
import "../styles/money-town.css";

type Point = readonly [number, number];
type Brush = CanvasRenderingContext2D;
const ink = "#34335e";
const stops: Point[] = [
  [0.65, 3.15],
  [2.0, 3.15],
  [3.8, 3.15],
  [4.05, 4.5],
  [5.25, 4.5],
  [6.8, 4.5],
];

function iso(u: number, v: number, height = 0): Point {
  return [
    Math.round(130 + 19 * (u - v)),
    Math.round(26 + 8.5 * (u + v) - height),
  ];
}

function polygon(ctx: Brush, color: string, points: readonly Point[]) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

function tile(
  ctx: Brush,
  u: number,
  v: number,
  w: number,
  d: number,
  h: number,
  color: string,
) {
  polygon(ctx, color, [
    iso(u, v, h),
    iso(u + w, v, h),
    iso(u + w, v + d, h),
    iso(u, v + d, h),
  ]);
}

function block(
  ctx: Brush,
  u: number,
  v: number,
  w: number,
  d: number,
  base: number,
  h: number,
  colors: readonly [string, string, string],
) {
  const top = base + h;
  polygon(ctx, colors[1], [
    iso(u, v + d, top),
    iso(u + w, v + d, top),
    iso(u + w, v + d, base),
    iso(u, v + d, base),
  ]);
  polygon(ctx, colors[2], [
    iso(u + w, v, top),
    iso(u + w, v + d, top),
    iso(u + w, v + d, base),
    iso(u + w, v, base),
  ]);
  tile(ctx, u, v, w, d, top, colors[0]);
}

function facade(
  ctx: Brush,
  u: number,
  v: number,
  w: number,
  base: number,
  height: number,
  color: string,
  side = false,
) {
  const du = side ? 0 : w,
    dv = side ? w : 0;
  polygon(ctx, color, [
    iso(u, v, base),
    iso(u + du, v + dv, base),
    iso(u + du, v + dv, base + height),
    iso(u, v, base + height),
  ]);
}

function windowRow(
  ctx: Brush,
  u: number,
  v: number,
  count: number,
  z: number,
  side = false,
) {
  for (let i = 0; i < count; i++) {
    const a = u + (side ? 0 : i * 0.37),
      b = v + (side ? i * 0.37 : 0);
    facade(ctx, a, b, 0.23, z, 5, ink, side);
    facade(ctx, a + 0.025, b, 0.13, z + 1, 3, "#a5e8ef", side);
  }
}

function bank(ctx: Brush) {
  const u = 1.1,
    v = 0.55,
    w = 2.0,
    d = 1.35;
  block(ctx, u - 0.12, v - 0.12, w + 0.24, d + 0.24, 0, 2, [
    "#eeecca",
    "#9595a8",
    "#74778f",
  ]);
  block(ctx, u, v, w, d, 2, 15, ["#daff6d", "#cced70", "#90bc58"]);
  windowRow(ctx, u + 0.18, v + d, 2, 6);
  windowRow(ctx, u + 1.26, v + d, 2, 6);
  windowRow(ctx, u + w, v + 0.2, 3, 6, true);
  facade(ctx, u + 0.9, v + d, 0.32, 2, 9, ink);
  for (const step of [0.06, 0.73, 1.19, 1.86])
    facade(ctx, u + step, v + d, 0.1, 2, 13, "#f7ffae");
  block(ctx, u - 0.1, v - 0.1, w + 0.2, d + 0.2, 17, 3, [
    "#dfe4ff",
    "#5360ac",
    "#3c437a",
  ]);
  block(ctx, u + 0.1, v + 0.06, w - 0.2, d - 0.12, 20, 2, [
    "#8c95e5",
    "#7279c8",
    "#535daf",
  ]);
  // A brass coin sign crowns the savings bank.
  const [x, y] = iso(u + 1, v + 0.7, 22);
  ctx.fillStyle = ink;
  ctx.fillRect(x - 1, y - 6, 3, 7);
  for (const [dx, dy, rw, rh, color] of [
    [-5, -15, 10, 8, ink],
    [-3, -17, 6, 12, ink],
    [-4, -14, 8, 6, "#ffbe43"],
    [-2, -16, 4, 10, "#ffd861"],
    [-1, -14, 2, 6, "#8f5c41"],
    [-3, -14, 1, 4, "#fff7a8"],
  ] as const) {
    ctx.fillStyle = color;
    ctx.fillRect(x + dx, y + dy, rw, rh);
  }
}

function apartment(ctx: Brush) {
  const u = 4.25,
    v = 0.44,
    w = 1.35,
    d = 1.12;
  block(ctx, u, v, w, d, 0, 27, ["#b4a2ef", "#a388d6", "#795eaf"]);
  for (const level of [5, 14, 22]) {
    windowRow(ctx, u + 0.16, v + d, 3, level);
    windowRow(ctx, u + w, v + 0.14, 2, level, true);
  }
  facade(ctx, u + 0.55, v + d, 0.25, 0, 5, ink);
  block(ctx, u - 0.06, v - 0.06, w + 0.12, d + 0.12, 27, 2, [
    "#b7b9ff",
    "#676ac0",
    "#5559a0",
  ]);
  block(ctx, u + 0.22, v + 0.18, 0.57, 0.47, 29, 3, [
    "#dddaf7",
    "#9293c4",
    "#7978ab",
  ]);
}

function shop(ctx: Brush) {
  const u = 1.55,
    v = 4.18,
    w = 1.5,
    d = 1.0;
  block(ctx, u, v, w, d, 0, 12, ["#fedfbe", "#efab8f", "#da8a7a"]);
  windowRow(ctx, u + 0.12, v + d, 2, 3);
  facade(ctx, u + 0.98, v + d, 0.34, 0, 8, ink);
  block(ctx, u - 0.08, v - 0.06, w + 0.16, d + 0.12, 12, 2, [
    "#829df0",
    "#4e67a4",
    "#48558a",
  ]);
  for (let i = 0; i < 7; i++) {
    const left = u - 0.035 + i * 0.225,
      col = i % 2 ? "#fff1cc" : "#ef785f";
    polygon(ctx, col, [
      iso(left, v + d, 11),
      iso(left + 0.225, v + d, 11),
      iso(left + 0.225, v + d + 0.25, 9),
      iso(left, v + d + 0.25, 9),
    ]);
    facade(ctx, left, v + d + 0.25, 0.225, 7, 2, i % 2 ? "#e3d7b4" : "#c45955");
  }
}

const treeSprite = [
  "    aa    ",
  "   abba   ",
  "  abbcca  ",
  " abbcccca ",
  "abbcccbcca",
  " abcbccbba",
  "  abbbbba ",
  "   aadda  ",
  "    dd    ",
  "    dd    ",
];
function tree(ctx: Brush, u: number, v: number) {
  const [x, y] = iso(u, v);
  tile(ctx, u - 0.18, v - 0.05, 0.68, 0.34, 0, "#8cad83");
  const colors: Record<string, string> = {
    a: "#396a63",
    b: "#54967a",
    c: "#9acb87",
    d: "#746153",
  };
  treeSprite.forEach((line, row) =>
    [...line].forEach((p, col) => {
      if (colors[p]) {
        ctx.fillStyle = colors[p];
        ctx.fillRect(x - 7 + col * 1.5, y - 15 + row * 1.5, 1.6, 1.6);
      }
    }),
  );
}
function lamp(ctx: Brush, u: number, v: number) {
  const [x, y] = iso(u, v);
  ctx.fillStyle = ink;
  ctx.fillRect(x, y - 8, 1, 9);
  ctx.fillRect(x - 1, y - 10, 4, 4);
  ctx.fillStyle = "#ffe9a1";
  ctx.fillRect(x, y - 9, 2, 2);
}

function drawScene(ctx: Brush, player: Point) {
  ctx.clearRect(0, 0, 300, 154);
  ctx.fillStyle = "#e7e9ff";
  ctx.fillRect(0, 0, 300, 154);
  ctx.fillStyle = "#d6d9f4";
  for (let x = 3; x < 300; x += 9)
    for (let y = 4; y < 154; y += 9) ctx.fillRect(x, y, 1, 1);
  for (const [x, y] of [
    [16, 24],
    [234, 18],
    [262, 115],
    [13, 105],
  ]) {
    ctx.fillStyle = "#f6f6ff";
    ctx.fillRect(x, y, 18, 3);
    ctx.fillRect(x + 4, y - 3, 7, 3);
    ctx.fillRect(x + 9, y - 2, 5, 2);
  }
  tile(ctx, 0.28, 0.05, 8, 6, -7, "#c1c5e5");
  block(ctx, 0, 0, 8, 6, -5, 5, ["#b0d994", "#809c99", "#728b93"]);
  for (let u = 0; u < 8; u++)
    for (let v = 0; v < 6; v++) {
      tile(ctx, u, v, 1, 1, 0, (u + v) % 2 ? "#b8dca7" : "#c1e2ae");
      const [x, y] = iso(u + 0.45, v + 0.5);
      ctx.fillStyle = "#98bd92";
      ctx.fillRect(x, y, 2, 1);
      ctx.fillRect(x + 3, y - 1, 1, 1);
    }
  // The footpath winds through a larger square in front of the bank.
  tile(ctx, 0, 2.8, 8, 0.72, 0, "#f4e7cb");
  tile(ctx, 3.7, 0, 0.75, 6, 0, "#f4e7cb");
  tile(ctx, 4.05, 4.18, 3.95, 0.66, 0, "#f4e7cb");
  for (let u = 0.26; u < 8; u += 0.47)
    tile(ctx, u, 3.13, 0.13, 0.12, 0, "#c6b59f");
  for (let v = 0.2; v < 6; v += 0.47) tile(ctx, 4, v, 0.13, 0.12, 0, "#c6b59f");
  for (let u = 4.45; u < 8; u += 0.47)
    tile(ctx, u, 4.48, 0.13, 0.12, 0, "#c6b59f");
  // A shallow tiled pool beside the apartment and planters edging the plaza.
  tile(ctx, 6.05, 1.92, 1.4, 0.65, 0, "#f4e7cb");
  tile(ctx, 6.14, 1.98, 1.22, 0.5, 0, "#69b6cf");
  for (const [u, v] of [
    [6.3, 2.1],
    [6.8, 2.24],
  ]) {
    const [x, y] = iso(u, v);
    ctx.fillStyle = "#caebee";
    ctx.fillRect(x, y, 4, 1);
  }
  for (const [u, v] of [
    [2.75, 2.3],
    [4.8, 5.28],
    [5.22, 5.28],
  ]) {
    tile(ctx, u, v, 0.34, 0.3, 0, "#6c996c");
    const [x, y] = iso(u + 0.17, v + 0.14);
    ctx.fillStyle = "#ffb05d";
    ctx.fillRect(x, y - 2, 2, 2);
  }
  const objects: { depth: number; draw: () => void }[] = [
    { depth: 4.7, draw: () => bank(ctx) },
    { depth: 7.2, draw: () => apartment(ctx) },
    { depth: 8.1, draw: () => shop(ctx) },
    {
      depth: player[0] + player[1] + 0.07,
      draw: () => {
        const [x, y] = iso(...player);
        tile(ctx, player[0] - 0.16, player[1] - 0.08, 0.48, 0.32, 0, "#a7a29e");
        const sprite = [
          "   kkk   ",
          "  kpppk  ",
          "  kpppk  ",
          "   sss   ",
          "  kvvvk  ",
          "  svvvs  ",
          "   vvv   ",
          "   k k   ",
        ];
        const palette: Record<string, string> = {
          k: ink,
          p: "#f79754",
          s: "#f5c89a",
          v: "#5252ca",
        };
        sprite.forEach((line, row) =>
          [...line].forEach((color, col) => {
            if (palette[color]) {
              ctx.fillStyle = palette[color];
              const left = Math.round(col * 1.5),
                top = Math.round(row * 1.5);
              ctx.fillRect(
                x - 6 + left,
                y - 12 + top,
                Math.round((col + 1) * 1.5) - left,
                Math.round((row + 1) * 1.5) - top,
              );
            }
          }),
        );
        polygon(ctx, "#e85b4b", [
          [x - 3, y - 18],
          [x + 3, y - 18],
          [x, y - 15],
        ]);
      },
    },
  ];
  for (const [u, v] of [
    [0.35, 0.7],
    [0.65, 1.75],
    [6.65, 0.7],
    [7.25, 1.48],
    [0.5, 4.48],
    [0.79, 5.35],
    [6.78, 5.47],
    [7.46, 5.52],
  ])
    objects.push({ depth: u + v, draw: () => tree(ctx, u, v) });
  for (const [u, v] of [
    [1.22, 2.73],
    [5.75, 2.77],
    [5.8, 4.97],
  ])
    objects.push({ depth: u + v, draw: () => lamp(ctx, u, v) });
  objects.sort((a, b) => a.depth - b.depth).forEach((o) => o.draw());
}

export function MoneyTown({ turn }: { turn: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<Point>(stops[0]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const target =
      stops[Math.max(0, Math.min(5, Math.trunc(turn)))] ?? stops[0];
    const from = last.current;
    if (
      (from[0] === target[0] && from[1] === target[1]) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      last.current = target;
      drawScene(ctx, target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    function tick(time: number) {
      const t = Math.min(1, (time - start) / 360);
      const next: Point = [
        from[0] + (target[0] - from[0]) * t,
        from[1] + (target[1] - from[1]) * t,
      ];
      last.current = next;
      drawScene(ctx!, next);
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [turn]);
  return (
    <canvas
      width={300}
      height={154}
      aria-hidden="true"
      className="money-town"
      ref={canvas}
    />
  );
}
