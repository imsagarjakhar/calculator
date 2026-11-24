import { useEffect, useRef, useState } from "react";
import { MoneyTown } from "./MoneyTown";
import { plannerHref } from "../runtime/routes";

type Move = {
  label: string;
  cost?: number;
  save?: number;
  income?: number;
  joy?: number;
  note: string;
};
type Round = { day: number; place: string; prompt: string; moves: Move[] };
const rounds: Round[] = [
  {
    day: 1,
    place: "The bank",
    prompt:
      "Payday! Your bills are covered. What will you do with your 100 spare coins?",
    moves: [
      {
        label: "Save 35 coins",
        save: 35,
        note: "You put 35 coins aside for the unexpected.",
      },
      {
        label: "Save 15 coins",
        save: 15,
        note: "You started a reserve and kept most of your money handy.",
      },
      {
        label: "Keep it in my wallet",
        note: "All 100 coins are available for whatever comes next.",
      },
    ],
  },
  {
    day: 7,
    place: "The night market",
    prompt: "Your friends are heading out. Pick your evening.",
    moves: [
      {
        label: "Dinner out · 30 coins",
        cost: 30,
        joy: 3,
        note: "Dinner bought you three good memories.",
      },
      {
        label: "Cook together · 10 coins",
        cost: 10,
        joy: 2,
        note: "You shared a meal and kept the cost low.",
      },
      {
        label: "Meet for a walk · free",
        joy: 1,
        note: "A free evening still earned a good memory.",
      },
    ],
  },
  {
    day: 14,
    place: "The repair shop",
    prompt: "Your bike breaks down. How will you get to work?",
    moves: [
      {
        label: "Repair now · 35 coins",
        cost: 35,
        note: "The bike is fixed for the rest of the month.",
      },
      {
        label: "Bus pass · 20 coins",
        cost: 20,
        note: "Your commute is covered. The bike will still need a repair next month.",
      },
      {
        label: "Borrow a bike · free",
        note: "A neighbour lent you a bike. You agreed to return the favour.",
      },
    ],
  },
  {
    day: 21,
    place: "The town square",
    prompt: "You have a free Saturday. How will you spend it?",
    moves: [
      {
        label: "Work a shift · earn 25",
        income: 25,
        note: "One shift added 25 coins to your wallet.",
      },
      {
        label: "Take a class · 15 coins",
        cost: 15,
        joy: 2,
        note: "You spent the day learning something you enjoy.",
      },
      {
        label: "Rest at home · free",
        joy: 1,
        note: "You protected a day of rest without spending.",
      },
    ],
  },
  {
    day: 28,
    place: "The station",
    prompt: "A family visit comes up before payday. Choose how to connect.",
    moves: [
      {
        label: "Take the train · 45 coins",
        cost: 45,
        joy: 3,
        note: "You made the trip and spent time together.",
      },
      {
        label: "Share a ride · 20 coins",
        cost: 20,
        joy: 2,
        note: "Sharing the journey cut the cost of the visit.",
      },
      {
        label: "Plan a video call · free",
        joy: 1,
        note: "You stayed in touch and kept your coins for next month.",
      },
    ],
  },
];
const opening = { wallet: 100, savings: 0, joy: 0 };
function applyMove(state: typeof opening, move: Move) {
  const cost = move.cost ?? 0;
  const reserveUsed = Math.min(state.savings, Math.max(0, cost - state.wallet));
  return {
    wallet:
      state.wallet + (move.income ?? 0) - (move.save ?? 0) - cost + reserveUsed,
    savings: state.savings + (move.save ?? 0) - reserveUsed,
    joy: state.joy + (move.joy ?? 0),
  };
}
export function PaydayQuest() {
  const [playing, setPlaying] = useState(false);
  const [choices, setChoices] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [previousMonth, setPreviousMonth] = useState<typeof opening | null>(
    null,
  );
  const step = choices.length,
    finished = step === rounds.length;
  const month = rounds.map(
    (r, i): Round =>
      i === 3 && choices[2] === 2
        ? {
            ...r,
            prompt:
              "Your neighbour needs the bike back on Saturday. What will you do with the rest of the day?",
            moves: [
              {
                label: "Short shift · earn 10",
                income: 10,
                note: "Returning the bike left time for a shorter shift.",
              },
              {
                label: "Help your neighbour · free",
                joy: 2,
                note: "You returned the favour and spent the afternoon together.",
              },
              r.moves[2],
            ],
          }
        : r,
  );
  const round = month[Math.min(step, month.length - 1)];
  const state = choices.reduce(
    (s, c, i) => applyMove(s, month[i].moves[c]),
    opening,
  );
  const move = selected === null ? undefined : round.moves[selected];
  const balance = move ? applyMove(state, move) : state;
  const panel = useRef<HTMLElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (playing) heading.current?.focus({ preventScroll: true });
  }, [playing, step]);
  function start() {
    if (finished) setPreviousMonth(state);
    setChoices([]);
    setSelected(null);
    setPlaying(true);
    panel.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  const profile =
    state.joy >= 7
      ? "You make room for experiences."
      : state.savings >= 25
        ? "You protect a rainy-day fund."
        : state.wallet >= 70
          ? "You keep your options open."
          : "You balance plans with the moment.";
  return (
    <section className="quest-hero" aria-labelledby="welcomeTitle">
      <div className="quest-intro">
        <p className="quest-kicker">
          <span aria-hidden="true">✦</span> Financial habits game
        </p>
        <h1 id="welcomeTitle" tabIndex={-1}>
          Make it to <em>payday.</em>
        </h1>
        <p className="quest-deck">
          One month. 100 coins. Five everyday money decisions. Play your way
          through town and see which financial habits show up.
        </p>
        <div className="quest-actions">
          {!playing ? (
            <button onClick={start}>
              Play Payday Quest <span aria-hidden="true">▶</span>
            </button>
          ) : (
            <button
              onClick={() => {
                panel.current?.scrollIntoView({ block: "center" });
                heading.current?.focus({ preventScroll: true });
              }}
            >
              View {finished ? "my results" : "my game"}
            </button>
          )}
          <a href={plannerHref("all-calculators")}>Browse calculators</a>
        </div>
        <p className="quest-meta">
          About 2 minutes <span>·</span> No sign-up
        </p>
        <noscript>Enable JavaScript to play Payday Quest.</noscript>
      </div>
      <section
        className="quest-console"
        aria-label="Payday Quest game"
        ref={panel}
      >
        <header>
          <strong>
            <span aria-hidden="true">✦</span> Payday Quest
          </strong>
          <span>
            {finished
              ? "Month complete"
              : playing
                ? "Day " + round.day
                : "Town map"}
          </span>
        </header>
        <MoneyTown turn={step} />
        {!playing ? (
          <div className="quest-invite">
            <div>
              <small>Your starting wallet</small>
              <strong>100 coins</strong>
            </div>
            <button onClick={start} aria-label="Start Payday Quest">
              Start game <span aria-hidden="true">▶</span>
            </button>
          </div>
        ) : (
          <div className="quest-play">
            <progress
              className="quest-progress"
              aria-label="Decisions completed"
              value={step}
              max={rounds.length}
            />
            <div className="quest-balances">
              <span>
                Wallet <b>{balance.wallet}</b>
              </span>
              <span>
                Reserve <b>{balance.savings}</b>
              </span>
              <span>
                Memories <b>{balance.joy}</b>
              </span>
            </div>
            {finished ? (
              <>
                <h2 ref={heading} tabIndex={-1}>
                  {profile}
                </h2>
                <p>
                  You finished with {state.wallet + state.savings} coins and{" "}
                  {state.joy} memories.{" "}
                  {state.savings > 0
                    ? "You kept " + state.savings + " coins in reserve."
                    : "Your remaining coins are in your wallet."}
                </p>
                <details>
                  <summary>See my five decisions</summary>
                  <ol>
                    {choices.map((c, i) => (
                      <li key={i}>
                        {month[i].place} · {month[i].moves[c].label}
                      </li>
                    ))}
                  </ol>
                </details>
                {previousMonth && (
                  <p className="quest-comparison">
                    Last time you ended with{" "}
                    {previousMonth.wallet + previousMonth.savings} coins and{" "}
                    {previousMonth.joy} memories.
                  </p>
                )}
                <p className="quest-reflection">
                  Which choice would you repeat on your next real payday?
                </p>
                <div className="quest-end">
                  <button onClick={start}>Play again</button>
                  <a href={plannerHref("salary-budget")}>Try my own budget</a>
                </div>
              </>
            ) : (
              <>
                <small>
                  Decision {step + 1} of 5 · {round.place}
                </small>
                <h2 ref={heading} tabIndex={-1}>
                  {round.prompt}
                </h2>
                {move ? (
                  <div aria-live="polite">
                    <p>
                      {move.note}{" "}
                      {balance.savings < state.savings
                        ? "You drew " +
                          (state.savings - balance.savings) +
                          " coins from your reserve."
                        : ""}
                    </p>
                    <button
                      autoFocus
                      onClick={() => {
                        setChoices([...choices, selected!]);
                        setSelected(null);
                      }}
                    >
                      {step === 4 ? "See my habits" : "Next stop"}
                    </button>
                  </div>
                ) : (
                  <div className="quest-options">
                    {round.moves.map((m, i) => (
                      <button
                        key={m.label}
                        disabled={(m.cost ?? 0) > state.wallet + state.savings}
                        onClick={() => setSelected(i)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </section>
  );
}
