import type { ReactNode } from "react";

// Each cover depicts the task behind its card. Text and links live in the card.
const scenes: Record<string, ReactNode> = {
  markets: (
    <>
      <circle cx="85" cy="50" r="34" fill="#d7e9ce" />
      <ellipse cx="85" cy="50" rx="17" ry="34" />
      <path d="M52 42h66M53 60h63M85 16v68" />
      <path
        d="m96 66 13-14 9 5 17-22m-12 0h12v12"
        stroke="#eab458"
        strokeWidth="5"
      />
    </>
  ),
  currency: (
    <>
      <g transform="rotate(-9 78 45)">
        <rect x="40" y="26" width="68" height="39" rx="5" fill="#dce8bd" />
        <circle cx="74" cy="45" r="12" />
        <path d="M48 34h5m42 21h5" />
      </g>
      <circle cx="112" cy="61" r="18" fill="#ebc476" />
      <circle cx="112" cy="61" r="12" />
      <path d="M99 21q14-6 24 4l-2-8m2 8-8-1M76 77q-16 7-27-2l8 1" />
    </>
  ),
  vlog: (
    <>
      <g transform="rotate(-7 83 50)">
        <rect x="47" y="17" width="70" height="68" rx="4" fill="#fff6dd" />
        <path d="M57 28h49M86 38h20m-20 8h20m-20 8h20M57 66h49m-49 8h34" />
        <rect x="57" y="38" width="20" height="18" fill="#95b789" />
      </g>
      <path d="m113 59 14-27 5 3-13 27-7 6z" fill="#e4ab5e" />
    </>
  ),
  salary: (
    <>
      <g transform="rotate(-7 77 44)">
        <rect x="50" y="19" width="65" height="40" rx="4" fill="#c9dba7" />
        <circle cx="82" cy="38" r="10" />
        <path d="M57 27h6m37 23h7" />
      </g>
      <path d="m39 39 69-6q6-1 7 7l2 34-77 6z" fill="#83a67f" />
      <rect x="39" y="43" width="85" height="37" rx="7" fill="#f0ca84" />
      <rect x="99" y="53" width="29" height="14" rx="5" fill="#ffebbb" />
      <circle cx="107" cy="60" r="2" fill="#31553c" />
    </>
  ),
  loan: (
    <>
      <rect x="49" y="18" width="65" height="65" rx="5" fill="#fff7e2" />
      <path d="M59 30h30M59 43h13m-13 11h13m-13 11h13" />
      <path
        d="M81 44l10 9 9-4 16 17m-12 0h12V54"
        stroke="#bd803a"
        strokeWidth="4"
      />
      <circle cx="116" cy="27" r="12" fill="#abc69c" />
      <path d="m110 27 4 4 7-9" />
    </>
  ),
  growth: (
    <>
      <path d="M38 80h90" />
      <path d="M49 79V61h15v18m8 0V48h15v31m8 0V33h15v46" fill="#a3bf88" />
      <path
        d="M44 49q36-1 64-31m-13 0h14v14"
        stroke="#2d7650"
        strokeWidth="4"
      />
      <circle cx="123" cy="61" r="12" fill="#edc675" />
      <circle cx="123" cy="61" r="7" />
    </>
  ),
  survival: (
    <>
      <path
        d="M47 20h43m-43 59h43M52 22c0 17 4 22 16 28-11 6-16 15-16 26h34c0-12-5-21-16-26 12-6 16-14 16-28z"
        fill="#f8ebc7"
      />
      <path d="m58 34 10 11 11-11zM58 71l10-10 11 10z" fill="#d9a452" />
      <g fill="#a2bc88">
        <rect x="96" y="66" width="29" height="8" rx="4" />
        <rect x="96" y="58" width="29" height="8" rx="4" />
        <rect x="96" y="50" width="29" height="8" rx="4" />
      </g>
    </>
  ),
  custom: (
    <>
      <rect x="43" y="21" width="84" height="59" rx="7" fill="#f7f0d8" />
      <path d="M44 37h82M59 15v13m48-13v13M56 49h57m-57 15h57" />
      <rect x="68" y="43" width="11" height="12" rx="4" fill="#8eb286" />
      <rect x="93" y="58" width="11" height="12" rx="4" fill="#e6b76a" />
    </>
  ),
  freedom: (
    <>
      <circle cx="106" cy="35" r="16" fill="#ecc273" />
      <path d="m29 76 42-46 41 46z" fill="#a0b797" />
      <path d="m69 78 27-31 34 31z" fill="#668d72" />
      <path d="m59 43 12-13 13 15-10-4-5 4z" fill="#fff3d8" />
      <path d="M71 30V13l19 4-19 6" fill="#ecc273" />
    </>
  ),
  retirement: (
    <>
      <g fill="#f5e9c8">
        <path d="m29 53 5 25h27l5-25z" />
        <path d="m65 47 5 31h26l5-31z" />
        <path d="m101 41 6 37h26l6-37z" />
      </g>
      <path d="M30 53q18-25 35 0m1-6q17-28 34 0m3-6q17-29 35 0" />
      <path d="M39 65h15m21-5h15m22-6h14" stroke="#81a475" strokeWidth="4" />
    </>
  ),
};
export function ToolScene({ kind }: { kind: string }) {
  return (
    <svg
      aria-hidden="true"
      className="tool-scene"
      viewBox="0 0 166 96"
      fill="none"
      stroke="#31553c"
      strokeWidth="2.3"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <ellipse
        cx="84"
        cy="83"
        rx="52"
        ry="4"
        fill="#324929"
        opacity=".12"
        stroke="none"
      />
      {scenes[kind]}
    </svg>
  );
}
