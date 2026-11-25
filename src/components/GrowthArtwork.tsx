import "../styles/growth-art.css";

export function GrowthArtwork() {
  return (
    <div className="growth-art" aria-hidden="true">
      <svg
        viewBox="0 0 320 165"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <linearGradient id="deposit-paper" x2=".8" y2="1">
            <stop stopColor="#fffdf0" />
            <stop offset="1" stopColor="#e4ebce" />
          </linearGradient>
          <linearGradient id="bullion-face" x2=".6" y2="1">
            <stop stopColor="#ffe99c" />
            <stop offset=".55" stopColor="#f8c75b" />
            <stop offset="1" stopColor="#d99a37" />
          </linearGradient>
        </defs>
        <ellipse cx="166" cy="143" rx="97" ry="8" fill="#3b5935" opacity=".1" />
        <g className="scene-deposit">
          <g transform="rotate(-7 157 86)">
            <rect
              x="72"
              y="31"
              width="151"
              height="105"
              rx="7"
              fill="#9cae81"
            />
            <rect
              x="69"
              y="26"
              width="151"
              height="105"
              rx="7"
              fill="url(#deposit-paper)"
              stroke="#6e8666"
              strokeWidth="2"
            />
            <rect
              x="77"
              y="34"
              width="135"
              height="89"
              rx="3"
              stroke="#a9b397"
              strokeDasharray="3 3"
            />
            <path
              d="m101 57 18-12 18 12zm3 4h31m-27 3v13m9-13v13m9-13v13m-23 4h32"
              stroke="#426951"
              strokeWidth="3"
            />
            <path
              d="M148 51h44m-44 9h34m-34 10h42M93 93h53m-53 8h40"
              stroke="#abb691"
              strokeWidth="3"
            />
            <path d="m168 106-3 17 9-5 7 7 3-20" fill="#bf8e40" />
            <circle cx="177" cy="98" r="14" fill="#eac777" stroke="#ac873e" />
            <circle cx="177" cy="98" r="9" stroke="#cba454" />
          </g>
          <circle cx="228" cy="111" r="30" fill="#c0b884" />
          <circle cx="225" cy="107" r="28" fill="#315b43" />
          <circle cx="225" cy="107" r="22" fill="#fcf6db" />
          <path
            d="M225 90v4m17 13h-4m-13 17v-4m-17-13h4m13-10v10l9 5"
            stroke="#44684e"
            strokeWidth="2.7"
          />
        </g>
        <g className="scene-gold">
          {[
            [65, 86],
            [149, 86],
            [109, 55],
          ].map(([x, y]) => (
            <g
              key={x}
              transform={`translate(${x} ${y})`}
              stroke="#a7772a"
              strokeWidth="1.5"
            >
              <path d="m0 31 12-25 50-9 22 9-10 24-52 12z" fill="#b68537" />
              <path d="m0 31 12-25 19 8-9 28z" fill="#dbac52" />
              <path d="m12 6 50-9 22 9-53 8z" fill="#fff0ab" />
              <path d="m31 14 53-8 9 25-71 11z" fill="url(#bullion-face)" />
              <path d="m44 23 25-4m-23 8 15-2" stroke="#cd973a" />
            </g>
          ))}
          <path
            d="m216 43 3 9 9 3-9 3-3 9-3-9-9-3 9-3zM87 62l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"
            fill="#fff9dd"
            stroke="#bba24c"
          />
        </g>
        <g className="scene-fund">
          <g transform="rotate(-7 154 80)">
            <rect
              x="80"
              y="27"
              width="145"
              height="101"
              rx="8"
              fill="#a5b998"
            />
            <rect
              x="75"
              y="22"
              width="145"
              height="101"
              rx="8"
              fill="url(#deposit-paper)"
              stroke="#779277"
              strokeWidth="2"
            />
            <path d="M89 37h49m-49 6h29" stroke="#93a98e" strokeWidth="3" />
            <circle cx="115" cy="79" r="25" fill="#599276" />
            <path d="M115 79V54a25 25 0 0 1 21 38z" fill="#e7bb69" />
            <path d="m115 79 21 13a25 25 0 0 1-38 5z" fill="#a2bd83" />
            <circle cx="115" cy="79" r="11" fill="#f5f5de" />
            <path d="M155 60h42m-42 15h42m-42 15h42" stroke="#d1dbc5" />
            <path
              d="M154 98V83h9v15zm16 0V72h9v26zm16 0V59h9v39z"
              fill="#5c886b"
            />
          </g>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(0 ${-i * 6})`}>
              <path
                d="M188 128q0 8 22 8t22-8v-6h-44z"
                fill="#d2a34f"
                stroke="#ae863e"
              />
              <ellipse
                cx="210"
                cy="122"
                rx="22"
                ry="7"
                fill="#f2d78f"
                stroke="#b4904b"
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
