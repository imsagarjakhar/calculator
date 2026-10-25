import {
  cashFlow,
  payment,
  simulate,
  protectedSavingsAt,
  validateLoanPlan,
  type LoanPlan,
  type LoanAsset,
} from "./model.ts";
import { resolveLoanPlan } from "./origination.ts";
import { netRent } from "./assets.ts";
export { netRent } from "./assets.ts";

export type DecisionRow = {
  month: number;
  debt: number;
  liquid: number;
  assetValue: number;
  net: number;
  interest: number;
  paid: number;
  fees: number;
  rent: number;
  shortfall: number;
  arrears: number;
};
export type Decision = {
  investment?: { contributed: number; value: number; tax: number };
  id: string;
  name: string;
  description: string;
  rows: DecisionRow[];
  interest: number;
  fees: number;
  debtFree: number | null;
  rentReceived: number;
  initialPayment: number;
  initialFees: number;
  saleProceeds: number;
  fundingGap: number;
  error: string | null;
  paidOff: Record<string, number>;
  remaining: Record<string, number>;
  firstPayments: Record<string, number>;
};

/** Same starting wealth and monthly commitment, including sale settlement costs. */
export function decisionScenario(
  p: LoanPlan,
  id: string,
  name: string,
  description: string,
  useSavings = false,
  soldId?: string,
  extraPayments = true,
  investSurplus = false,
): Decision {
  p = resolveLoanPlan(p);
  const assets = p.assets ?? [];
  const sold = assets.find((a) => a.id === soldId);
  const balances = p.loans.map((l) => l.balance);
  const commitment = cashFlow(p).baseBudget;
  const order = p.loans
    .map((loan, index) => ({ loan, index }))
    .sort(
      (a, b) =>
        b.loan.rate * (1 - b.loan.taxRelief / 100) -
          a.loan.rate * (1 - a.loan.taxRelief / 100) || a.index - b.index,
    );
  let cash = p.lumpSum ?? 0,
    portfolio = 0,
    contributed = 0,
    initialPayment = 0,
    initialFees = 0,
    saleProceeds = 0;
  let error: string | null = null;
  if (sold) {
    saleProceeds = sold.value * (1 - sold.sellingCost / 100) - sold.saleTax;
    const index = p.loans.findIndex((l) => l.id === sold.linkedLoanId);
    if (index >= 0) {
      const loan = p.loans[index];
      const fee = (balances[index] * loan.fee) / 100;
      if (loan.lock > 0 && balances[index] > 0)
        error =
          "The linked loan has a prepayment lock-in. Confirm lender settlement terms before modeling a sale today.";
      if (saleProceeds + 1e-7 < balances[index] + fee)
        error =
          "Net sale proceeds cannot settle the linked loan and its entered closure fee. Additional settlement cash is needed; this sale is not modeled.";
      if (!error) {
        saleProceeds -= balances[index] + fee;
        initialPayment += balances[index];
        initialFees += fee;
        balances[index] = 0;
      }
    }
    if (saleProceeds < 0)
      error =
        "Selling costs and entered taxes exceed the asset value. Review the sale assumptions.";
    if (!error) cash += saleProceeds;
  }
  const payExtra = (available: number, month: number) => {
    const payments: Record<string, number> = Object.create(null);
    let left = available,
      principal = 0,
      fees = 0;
    for (const { loan, index } of order) {
      if (
        (month === 0 ? loan.lock > 0 : month <= loan.lock) ||
        balances[index] <= 1e-7
      )
        continue;
      const paid = Math.min(balances[index], left / (1 + loan.fee / 100));
      const fee = (paid * loan.fee) / 100;
      balances[index] = Math.max(0, balances[index] - paid);
      if (balances[index] < 1e-7) balances[index] = 0;
      payments[loan.id] = paid + fee;
      left = Math.max(0, left - paid - fee);
      principal += paid;
      fees += fee;
    }
    return { left, principal, fees, payments };
  };
  // Sale proceeds are applied alone; spare savings stay liquid unless explicitly selected.
  if (!error && (useSavings || sold)) {
    const available = useSavings ? cash : Math.max(0, saleProceeds);
    const paid = payExtra(available, 0); // Only loans with no lock-in are eligible today.
    cash -= paid.principal + paid.fees;
    initialPayment += paid.principal;
    initialFees += paid.fees;
    if (sold && investSurplus) {
      portfolio = paid.left;
      contributed = paid.left;
      cash -= paid.left;
    }
  }
  const held = error ? assets : assets.filter((a) => a.id !== soldId);
  const valueAt = (month: number) =>
    held.reduce(
      (sum, a) =>
        sum + a.value * Math.pow(1 + a.appreciation / 100, month / 12),
      0,
    );
  const totalDebt = () => balances.reduce((sum, n) => sum + n, 0);
  const reserveAt = (month: number) => protectedSavingsAt(p, month);
  const liquidValue = () =>
    cash +
    portfolio -
    (Math.max(0, portfolio - contributed) * p.gainsTax) / 100;
  const paidOff: Record<string, number> = Object.create(null);
  const firstPayments: Record<string, number> = Object.create(null);
  p.loans.forEach((loan, index) => {
    if (balances[index] < 1e-7) paidOff[loan.id] = 0;
  });
  const rows: DecisionRow[] = [
    {
      month: 0,
      debt: totalDebt(),
      liquid: liquidValue(),
      assetValue: valueAt(0),
      net: liquidValue() + valueAt(0) + reserveAt(0) - totalDebt(),
      interest: 0,
      paid: initialPayment,
      fees: initialFees,
      rent: 0,
      shortfall: 0,
      arrears: 0,
    },
  ];
  let interest = 0,
    fees = initialFees,
    rentReceived = 0,
    fundingGap = 0;
  let arrears = 0;
  let debtFree: number | null = totalDebt() < 1e-7 ? 0 : null;
  const cashRate = Math.expm1(Math.log1p((p.cashReturn ?? 0) / 100) / 12);
  const investmentRate =
    Math.pow((1 + p.returns / 100) * (1 - p.investmentFee / 100), 1 / 12) - 1;
  for (let month = 1; month <= p.horizon && !error; month++) {
    cash *= 1 + cashRate;
    portfolio *= 1 + investmentRate;
    let rentalChange = 0,
      rent = 0;
    for (const asset of assets) {
      const isHeld = asset.id !== soldId;
      if (isHeld) rent += netRent(asset, month);
      rentalChange +=
        (isHeld ? netRent(asset, month) : 0) -
        (asset.rentIncluded ? netRent(asset) : 0);
      if (!isHeld) rentalChange -= asset.replacementCost ?? 0;
    }
    const funding = commitment + rentalChange;
    arrears += Math.max(0, -funding);
    const due = balances.map((balance, index) => {
      const charge = (balance * p.loans[index].rate) / 1200;
      balances[index] += charge;
      return {
        interest: charge,
        required: Math.min(
          balances[index],
          balance > 1e-7 ? payment(p.loans[index]) : 0,
        ),
      };
    });
    const required = due.reduce((sum, l) => sum + l.required, 0);
    const shortfall = Math.max(0, required - funding);
    fundingGap += shortfall;
    // Fund every required payment proportionally if the rental-loss scenario is unaffordable.
    const factor =
      required > 0 ? Math.min(1, Math.max(0, funding) / required) : 1;
    let paid = 0,
      monthInterest = 0,
      credit = 0;
    due.forEach((item, index) => {
      const amount = item.required * factor;
      balances[index] = Math.max(0, balances[index] - amount);
      if (balances[index] < 1e-7) balances[index] = 0;
      if (month === 1) firstPayments[p.loans[index].id] = amount;
      paid += amount;
      monthInterest += item.interest;
      // Relief is limited to interest actually paid; eligibility is entered by the user.
      credit +=
        (Math.min(amount, item.interest) * p.loans[index].taxRelief) / 100;
    });
    let left = Math.max(0, funding - paid),
      monthFees = 0;
    if (extraPayments) {
      const extra = payExtra(left, month);
      left = extra.left;
      paid += extra.principal;
      monthFees = extra.fees;
      if (month === 1)
        for (const [id, payment] of Object.entries(extra.payments))
          firstPayments[id] = (firstPayments[id] ?? 0) + payment;
    }
    // Negative operating cash flow beyond the committed budget is reported, never invented as funding.
    if (investSurplus) {
      portfolio += left + credit;
      contributed += left + credit;
    } else cash += left + credit;
    interest += monthInterest;
    fees += monthFees;
    rentReceived += rent;
    const debt = totalDebt();
    p.loans.forEach((loan, index) => {
      if (balances[index] < 1e-7 && paidOff[loan.id] === undefined)
        paidOff[loan.id] = month;
    });
    if (debt < 1e-7 && debtFree === null) debtFree = month;
    rows.push({
      month,
      debt,
      liquid: liquidValue(),
      assetValue: valueAt(month),
      net: liquidValue() + valueAt(month) + reserveAt(month) - debt - arrears,
      interest: monthInterest,
      paid,
      fees: monthFees,
      rent,
      shortfall,
      arrears,
    });
  }
  return {
    ...(investSurplus
      ? {
          investment: {
            contributed,
            value: portfolio,
            tax: (Math.max(0, portfolio - contributed) * p.gainsTax) / 100,
          },
        }
      : {}),
    id,
    name,
    description,
    rows,
    interest,
    fees,
    debtFree,
    rentReceived,
    initialPayment,
    initialFees,
    saleProceeds,
    fundingGap,
    error,
    paidOff,
    firstPayments,
    remaining: Object.fromEntries(
      p.loans.map((loan, index) => [loan.id, balances[index]]),
    ),
  };
}
export function compareDecisions(p: LoanPlan) {
  p = resolveLoanPlan(p);
  if (validateLoanPlan(p).length || !p.loans.some((l) => l.balance > 0))
    return [];
  const cash = cashFlow(p);
  if (
    (cash.capacity < -1e-6 && cash.capacity + cash.additionalRent < -1e-6) ||
    (p.fundingMode !== "manual" && cash.unassigned < -1e-6)
  )
    return [];
  const result = [
    decisionScenario(
      p,
      "minimum",
      "EMIs only, keep the rest as cash",
      "Pay required EMIs; retain the same monthly surplus as cash.",
      false,
      undefined,
      false,
    ),
    decisionScenario(
      p,
      "monthly",
      "Pay extra each month",
      "Keep assets; direct monthly surplus to eligible high-interest loans.",
    ),
  ];
  // Use the same investment engine as the main repayment-versus-investing view.
  for (const strategy of ["invest", "avalanche"] as const) {
    const investment = simulate(p, strategy);
    let invested = 0;
    result.push({
      id: strategy === "invest" ? "invest" : "repay-invest",
      name:
        strategy === "invest"
          ? "Invest the extra money"
          : "Pay extra toward loans, then invest",
      description:
        strategy === "invest"
          ? "Pay regular EMIs first; invest the surplus and released EMIs instead of making extra loan payments."
          : "Use surplus to repay eligible highest-interest loans first. Only money left after repayments is invested; once loans finish, invest the released monthly money.",
      rows: [
        result[0].rows[0],
        ...investment.rows.map((row) => {
          invested += row.invested;
          return {
            month: row.month,
            debt: row.debt,
            liquid:
              row.portfolio -
              (Math.max(0, row.portfolio - invested) * p.gainsTax) / 100 +
              row.spareCash,
            assetValue: row.assetValue,
            net: row.net,
            interest: row.interest,
            paid: row.required + row.extra,
            fees: row.fees,
            rent: row.rent,
            shortfall: row.shortfall,
            arrears: row.arrears,
          };
        }),
      ],
      interest: investment.interest,
      fees: investment.fees,
      debtFree: investment.debtFree,
      rentReceived: investment.rentReceived,
      initialPayment: 0,
      initialFees: 0,
      saleProceeds: 0,
      fundingGap: investment.fundingGap,
      error: null,
      paidOff: investment.paidOff,
      remaining: Object.fromEntries(
        investment.rows.at(-1)!.loans.map((loan) => [loan.id, loan.closing]),
      ),
      firstPayments: Object.fromEntries(
        investment.rows[0].loans.map((loan) => [
          loan.id,
          loan.required + loan.extra + loan.fee,
        ]),
      ),
      investment: {
        contributed: investment.contributed,
        value: investment.portfolio,
        tax: investment.investmentTax,
      },
    });
  }
  if ((p.lumpSum ?? 0) > 0)
    result.push(
      decisionScenario(
        p,
        "savings",
        "Use spare savings now",
        "Use only the separate spare-savings balance, then continue monthly extra payments.",
        true,
      ),
    );
  for (const asset of p.assets ?? [])
    result.push(
      decisionScenario(
        p,
        `sell-${asset.id}`,
        `Sell ${asset.name}`,
        "Sell the asset, settle its linked loan and eligible debt, then invest remaining proceeds and monthly surplus. Sold-asset earnings stop.",
        false,
        asset.id,
        false,
        true,
      ),
    );
  return result;
}
