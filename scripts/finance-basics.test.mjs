import assert from "node:assert/strict";
import { test } from "node:test";
import {
  lessonTimeline,
  lessonDefaults,
  terms,
} from "../src/content/financeBasics.ts";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
test("learning examples separate contributions from returns", () => {
  const flat = lessonTimeline("sip", {
    ...lessonDefaults.sip,
    amount: 1000,
    rate: 0,
    years: 1,
  });
  near(flat.rows.at(-1).balance, 12000);
  near(flat.rows.at(-1).added, 12000);
  const growth = lessonTimeline("return", {
    ...lessonDefaults.return,
    amount: 1000,
    rate: 12,
    years: 1,
  });
  near(growth.rows.at(-1).balance, 1000 * 1.01 ** 12);
  near(growth.rows.at(-1).added, 1000);
  const loss = lessonTimeline("return", {
    ...lessonDefaults.return,
    rate: -10,
    years: 1,
  });
  assert.ok(loss.rows.at(-1).balance < loss.rows.at(-1).added);
});
test("withdrawal story stops paying when the jar empties", () => {
  const { rows } = lessonTimeline("swp", {
    amount: 1000,
    rate: 0,
    years: 1,
    withdrawal: 300,
  });
  near(rows[3].balance, 100);
  near(rows[4].balance, 0);
  near(rows.at(-1).withdrawn, 1000);
  assert.ok(rows.every((r) => r.balance >= 0));
});
test("inflation and EMI stories preserve their different meanings", () => {
  const price = lessonTimeline("inflation", {
    ...lessonDefaults.inflation,
    amount: 100,
    rate: 5,
    years: 1,
  });
  near(price.rows.at(-1).balance, 105);
  const loan = lessonTimeline("emi", {
    ...lessonDefaults.emi,
    amount: 10000,
    rate: 12,
    years: 3,
  });
  near(loan.rows.at(-1).balance, 0);
  near(loan.rows.at(-1).withdrawn - 10000, loan.rows.at(-1).interest);
  const longer = lessonTimeline("emi", {
    ...lessonDefaults.emi,
    amount: 10000,
    rate: 12,
    years: 6,
  });
  assert.ok(longer.emi < loan.emi);
  assert.ok(longer.rows.at(-1).interest > loan.rows.at(-1).interest);
  const free = lessonTimeline("emi", { ...lessonDefaults.emi, rate: 0 });
  near(free.rows.at(-1).interest, 0);
});
test("glossary examples use the currency formatter instead of fixed currency", () => {
  assert.ok(terms.length >= 40);
  for (const term of terms) {
    assert.ok(term.meaning.length > 10);
    assert.ok(!term.example((n) => `USD ${n}`).includes("₹"));
  }
});
