import { useState } from "react";
import { PlannerNavigation } from "../components/PlannerNavigation";
import { plannerHref } from "../runtime/routes";
import {
  currencies,
  currencyMoney,
  selectCurrency,
  useCurrency,
} from "../runtime/currency";
import {
  debtExample,
  examplesChecked,
  guideChapters,
  sequenceExample,
  sipExample,
} from "../content/planningExamples";
import { publisher } from "../content/publisher";

export function GuidesPage() {
  const currency = useCurrency(),
    money = (n: number) => currencyMoney(n, currency);
  const [returnRate, setReturnRate] = useState(12);
  const debt = debtExample(returnRate),
    sip = sipExample();
  const rate12 = debtExample(12),
    rate6 = debtExample(6);
  return (
    <main className="planner-page worked-guides">
      <PlannerNavigation />
      <header className="worked-guide-hero">
        <p className="worked-kicker">THE NUMBERS, EXPLAINED</p>
        <h1>Five money questions. Worked through.</h1>
        <p>
          See what goes in, what comes out, and what a calculator result can
          actually tell you.
        </p>
        <div className="worked-guide-meta">
          <span>
            By {publisher.name} · Examples checked{" "}
            <time dateTime={examplesChecked}>29 October 2026</time>
          </span>
          <label>
            Your currency{" "}
            <select
              aria-label="Guide currency"
              value={currency}
              onChange={(e) => selectCurrency(e.target.value)}
            >
              {currencies.map(([code, symbol]) => (
                <option key={code} value={code}>
                  {code} — {symbol}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="worked-note">
          All amounts are invented illustrations in your selected currency, not
          currency conversions or product recommendations. The examples explain
          arithmetic; they do not establish a suitable return, withdrawal rate
          or investment for you.
        </p>
      </header>
      <nav className="worked-guide-index" aria-label="Worked examples">
        {guideChapters.map((chapter, i) => (
          <a key={chapter.id} href={`#${chapter.id}`}>
            <span>0{i + 1}</span>
            <strong>{chapter.title}</strong>
          </a>
        ))}
      </nav>

      <article id="monthly-budget" className="worked-chapter">
        <p className="worked-kicker">01 / SALARY & BILLS</p>
        <h2>What is really left from my salary?</h2>
        <p>
          A salary total does not say how much you can invest. Start with money
          that reaches your account, then make room for commitments that are
          monthly and those that arrive later. A yearly insurance bill still
          needs funding during the months when no payment is due.
        </p>
        <dl className="worked-ledger">
          {[
            ["Take-home pay", 50000],
            ["Living costs", 30000],
            ["Required loan EMIs", 5000],
            ["Reserve for a yearly bill", 1000],
            ["Emergency saving", 2000],
            ["Unassigned cash buffer", 2000],
          ].map(([label, amount]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{money(Number(amount))}</dd>
            </div>
          ))}
          <div className="worked-total">
            <dt>Available for other goals</dt>
            <dd>{money(10000)} / month</dd>
          </div>
        </dl>
        <h3>Why the bill reserve matters</h3>
        <p>
          An annual bill of {money(12000)} due in twelve months needs{" "}
          {money(1000)} set aside per month if nothing has been saved. If it is
          due in three months and you already have {money(6000)}, the remaining{" "}
          {money(6000)} needs {money(2000)} each month. That temporarily reduces
          this example’s spare amount to {money(9000)}.
        </p>
        <p>
          When you pay the bill from its accumulated reserve, do not also treat
          the full payment as a new monthly expense funded from the same salary.
          Likewise, an EMI already entered among bills should not be deducted
          again when deciding how much money remains.
        </p>
        <aside className="worked-takeaway">
          <strong>Check before acting</strong>Compare the plan with actual bank
          transactions. Variable income, an upcoming move or family costs can
          make a fixed percentage budget unrealistic. Money reserved for bills
          is not spare investment money.
        </aside>
        <a className="worked-tool-link" href={plannerHref("salary-budget")}>
          Build this in the salary planner →
        </a>
        <p className="worked-source">
          Further reading:{" "}
          <a href="https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/">
            CFPB’s emergency-fund guide
          </a>{" "}
          explains why accessible reserves matter. The numerical budget above is
          our own illustration, not a recommended allocation.
        </p>
      </article>

      <article id="sip-growth" className="worked-chapter">
        <p className="worked-kicker">02 / MONTHLY INVESTING</p>
        <h2>How much of a SIP result is my own money?</h2>
        <p>
          A SIP is a schedule of regular investments. It does not promise a
          return. Consider {money(1000)} deposited at the end of every month for
          ten years, starting from zero, with no step-up, extra deposits, fees
          or tax in this example.
        </p>
        <div className="worked-metrics">
          <div>
            <span>Your 120 deposits</span>
            <strong>{money(sip.deposited)}</strong>
          </div>
          <div>
            <span>Illustrative growth</span>
            <strong>{money(sip.growth)}</strong>
          </div>
          <div>
            <span>Projected total</span>
            <strong>{money(sip.balance)}</strong>
          </div>
        </div>
        <div
          className="worked-money-bar"
          role="img"
          aria-label={`Deposits ${money(sip.deposited)}, growth ${money(sip.growth)}`}
        >
          <span style={{ width: `${(sip.deposited / sip.balance) * 100}%` }}>
            Deposits
          </span>
          <span>Growth</span>
        </div>
        <h3>The timing behind the number</h3>
        <p>
          This illustration follows the SIP planner’s convention: a 12% nominal
          annual input is divided by twelve, giving 1% monthly growth. Each
          month, the previous balance grows first and then the new deposit
          arrives. The last deposit therefore earns no return before this
          example ends. Twelve months of 1% growth imply about 12.68% effective
          annual growth; this is not a 12% effective annual-return model.
        </p>
        <p>
          The distinction matters when checking another calculator. A
          beginning-of-month contribution gets one additional month of growth.
          Changing contribution timing or replacing the nominal rate with an
          effective annual rate changes the answer even when both screens say
          “12%”. Our <a href={plannerHref("methodology")}>methodology</a>{" "}
          explains these conventions.
        </p>
        <div className="worked-table-wrap">
          <table>
            <caption>Same deposits and dates; different assumptions</caption>
            <thead>
              <tr>
                <th>Nominal annual input</th>
                <th>After ten years</th>
              </tr>
            </thead>
            <tbody>
              {[0, 6, 12].map((rate) => (
                <tr key={rate}>
                  <th>{rate}%</th>
                  <td>{money(sipExample(rate).balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          At an illustrative 6% annual inflation rate, the {money(sip.balance)}{" "}
          final balance has purchasing power of about {money(sip.todayValue)} in
          today’s money. That inflation adjustment is applied to the final
          balance, not subtracted as a fixed amount from each investment return.
        </p>
        <aside className="worked-takeaway">
          <strong>What this cannot tell you</strong>A smooth curve cannot
          predict market losses, missed deposits or whether an investment is
          appropriate. Try a lower return and a shorter investing period before
          treating the result as a goal you can fund.
        </aside>
        <a className="worked-tool-link" href={plannerHref("growth")}>
          Explore deposits and step-ups in the SIP planner →
        </a>
        <p className="worked-source">
          Further reading:{" "}
          <a href="https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator">
            Investor.gov’s compound-interest calculator
          </a>{" "}
          also separates initial capital, contributions, rates and timing. Its
          settings need not use our calculator’s timing convention.
        </p>
      </article>

      <article id="repay-or-invest" className="worked-chapter">
        <p className="worked-kicker">03 / DEBT OR INVESTMENTS</p>
        <h2>Why can interest saved differ from wealth gained?</h2>
        <p>
          Suppose an outstanding loan is {money(1000000)}, charged at 10.4%
          nominal annual interest, with 35 monthly EMIs left. You can commit{" "}
          {money(50000)} per month in total. Both choices must pay required
          EMIs, use the same monthly money and be measured at the same end date.
        </p>
        <div className="worked-choice-explainer">
          <div>
            <strong>Invest the surplus</strong>
            <p>
              Pay regular EMIs, then invest what remains at month end. As loans
              end, released EMIs become investment contributions.
            </p>
          </div>
          <div>
            <strong>Repay faster</strong>
            <p>
              Use surplus for eligible loan principal first. Once debt is
              cleared, invest the released money through the same finish date.
            </p>
          </div>
        </div>
        <label className="worked-return-input">
          Try an expected annual investment return{" "}
          <select
            aria-label="Worked loan investment return"
            value={returnRate}
            onChange={(e) => setReturnRate(Number(e.target.value))}
          >
            <option value="6">6%</option>
            <option value="12">12%</option>
            <option value="18">18%</option>
          </select>
        </label>
        <div className="worked-metrics" aria-live="polite">
          <div>
            <span>EMIs + invest</span>
            <strong>{money(debt.invest.net)}</strong>
          </div>
          <div>
            <span>Repay faster, then invest</span>
            <strong>{money(debt.repay.net)}</strong>
          </div>
          <div>
            <span>
              {debt.invest.net >= debt.repay.net
                ? "Investing ahead by"
                : "Faster repayment ahead by"}
            </span>
            <strong>{money(Math.abs(debt.invest.net - debt.repay.net))}</strong>
          </div>
        </div>
        <p>
          The calculation above includes a 0.5% annual investment fee and
          assumes zero investment-gains tax, prepayment fees and loan tax
          relief. It includes no property, spare savings or additional saving
          contributions. Loan interest accrues at 10.4% ÷ 12 monthly; the
          investment input is an effective annual return, reduced by the annual
          fee before conversion to monthly growth.
        </p>
        <div className="worked-table-wrap">
          <table>
            <caption>
              Readable even without JavaScript: the same loan at two investment
              returns
            </caption>
            <thead>
              <tr>
                <th>Expected annual return</th>
                <th>EMIs + invest</th>
                <th>Repay faster</th>
              </tr>
            </thead>
            <tbody>
              {[
                [6, rate6],
                [12, rate12],
              ].map(([rate, result]) => {
                const r = result as typeof rate6;
                return (
                  <tr key={Number(rate)}>
                    <th>{Number(rate)}%</th>
                    <td>{money(r.invest.net)}</td>
                    <td>{money(r.repay.net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3>Where a misleading comparison goes wrong</h3>
        <p>
          Interest avoided is a reduction in borrowing cost. It is not
          automatically a profit over investing. A comparison that keeps unused
          money as zero-return cash answers a different question. Comparing a
          fully invested ten-year path with a five-year payoff balance is also
          unfair unless both paths continue to the same end date.
        </p>
        <p>
          For this illustration, 12% becomes 11.44% effective annual growth
          after the entered fee. Tax on gains can reduce the investment result
          further; prepayment charges can reduce the benefit of early repayment.
          Changing these inputs can reverse which path ends with more projected
          wealth. The loan planner includes both investment opportunity cost and
          interest payments, so interest savings must not be added again to the
          final wealth.
        </p>
        <aside className="worked-takeaway">
          <strong>A projection is not a recommendation</strong>Investment
          returns are uncertain; a fixed loan’s interest terms are contractual
          assumptions. Liquidity, job stability, lender restrictions and tax
          eligibility still need checking. Neither this example nor a higher
          chart line establishes the right choice for a household.
        </aside>
        <a className="worked-tool-link" href={plannerHref("loan-payoff")}>
          Compare your own loan schedules →
        </a>
        <p className="worked-source">
          Further reading:{" "}
          <a href="https://www.investor.gov/introduction-investing/getting-started/understanding-fees">
            Investor.gov on investment fees
          </a>
          . The three-path comparison and numerical examples here are calculated
          with this site’s loan engine.
        </p>
      </article>

      <article id="asset-income" className="worked-chapter">
        <p className="worked-kicker">04 / ASSETS & INCOME</p>
        <h2>Does a valuable asset produce a good income?</h2>
        <p>
          An asset’s market value and the income available to spend are
          different amounts. Consider a property worth {money(2000000)}, earning{" "}
          {money(10000)} gross each month, with 10% vacancy and {money(2000)} in
          monthly running costs and entered taxes.
        </p>
        <dl className="worked-ledger">
          <div>
            <dt>Gross annual income yield</dt>
            <dd>6.00%</dd>
          </div>
          <div>
            <dt>Net monthly earnings</dt>
            <dd>{money(7000)}</dd>
          </div>
          <div className="worked-total">
            <dt>Net annual income yield</dt>
            <dd>4.20%</dd>
          </div>
        </dl>
        <p>
          Gross yield is monthly earnings × 12 ÷ market value. Net earnings are{" "}
          {money(10000)} × 90% − {money(2000)} = {money(7000)}; dividing twelve
          months of that amount by the market value gives 4.2%. These yields
          exclude price changes, selling costs and loan payments. Calling a 4.2%
          income yield the property’s complete return would leave those factors
          out.
        </p>
        <h3>What changes if you sell?</h3>
        <p>
          The sale path deducts entered transaction costs and sale taxes,
          settles a linked loan first, then applies proceeds to other eligible
          debt and invests the remainder. That asset no longer contributes its
          market value or its future earnings. Income already included in the
          monthly budget must be removed when the asset is sold, rather than
          left as a fictional continuing payment.
        </p>
        <aside className="worked-takeaway">
          <strong>Check the whole household picture</strong>A home you occupy
          may require replacement rent after sale. An illiquid asset may not
          sell at the entered valuation or date. Model replacement costs and a
          lower sale price; do not compare gross rent alone with a loan interest
          percentage.
        </aside>
        <a className="worked-tool-link" href={plannerHref("loan-payoff")}>
          Explore keeping an asset versus a sale →
        </a>
        <a className="worked-tool-link" href={plannerHref("custom-plan")}>
          Track assets and debt month by month →
        </a>
      </article>

      <article id="retirement-income" className="worked-chapter">
        <p className="worked-kicker">05 / LIFE AFTER WORK</p>
        <h2>What does a retirement income target mean?</h2>
        <p>
          A desired monthly income of {money(25000)} is {money(300000)} per
          year. At an illustrative initial withdrawal rate of 3%, that suggests{" "}
          {money(10000000)} of capital: annual spending ÷ 0.03. This is a
          starting relationship, not a finding that the money will last for
          life.
        </p>
        <p>
          If retirement begins ten years from now and costs rise at 6% annually,
          the same lifestyle needs about {money(25000 * 1.06 ** 10)} per month
          at that date. Applying 3% to that future annual amount gives about{" "}
          {money((300000 * 1.06 ** 10) / 0.03)}. Do not compare a future-money
          portfolio with an income target still expressed in today’s prices.
        </p>
        <h3>Why a constant return can hide risk</h3>
        <p>
          Here is a deliberately simple two-year illustration, separate from the
          monthly planners. Start with {money(100000)} and withdraw{" "}
          {money(10000)} at the beginning of each year. The two paths have the
          same returns in a different order, and no fees, tax or inflation.
        </p>
        <div className="worked-table-wrap">
          <table>
            <caption>Same returns, different order during withdrawals</caption>
            <thead>
              <tr>
                <th>Annual return order</th>
                <th>Balance after two withdrawals and returns</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>+20%, then −20%</th>
                <td>{money(sequenceExample([20, -20]))}</td>
              </tr>
              <tr>
                <th>−20%, then +20%</th>
                <td>{money(sequenceExample([-20, 20]))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Without withdrawals, either return order would leave {money(96000)}.
          With withdrawals, the early loss leaves less capital available for the
          rebound. A calculator using one smooth return cannot reproduce every
          market path. This is one reason a withdrawal percentage alone is not a
          guarantee.
        </p>
        <aside className="worked-takeaway">
          <strong>Use the tools for different questions</strong>The freedom
          planner explores when contributions may support an income goal. The
          survival planner explores withdrawals from an existing corpus. The
          bucket planner explores reserves and refills. Review longevity,
          expenses, inflation and a difficult early-return period, rather than
          treating their outputs as identical promises.
        </aside>
        <a className="worked-tool-link" href={plannerHref("freedom")}>
          Estimate a freedom goal →
        </a>
        <a className="worked-tool-link" href={plannerHref("survival")}>
          Explore corpus survival →
        </a>
        <a className="worked-tool-link" href={plannerHref("bucket-plan")}>
          Explore retirement buckets →
        </a>
        <p className="worked-source">
          Further reading:{" "}
          <a href="https://www.investor.gov/introduction-investing/investing-basics/what-risk">
            Investor.gov on investment and inflation risks
          </a>
          . The withdrawal examples are our own arithmetic illustrations, not a
          recommended withdrawal rule.
        </p>
      </article>
      <section className="worked-editorial">
        <h2>How these examples are maintained</h2>
        <p>
          Published by {publisher.name}. These are original worked illustrations
          prepared with AI assistance and checked against explicit formulas and
          this site’s calculation code. We do not claim an independent
          financial-adviser review, professional credentials or lender-verified
          results. The check date records this content revision, not an
          automatic freshness label.
        </p>
        <p>
          Found an error? Send the section name, currency and an invented
          example to{" "}
          <a href={`mailto:${publisher.contactEmail}`}>
            {publisher.contactEmail}
          </a>
          . Do not send bank statements or private financial reports. Material
          corrections should identify what changed and update the affected
          example and its check date.
        </p>
        <a href={plannerHref("methodology")}>
          Calculation methods & limitations →
        </a>
      </section>
    </main>
  );
}
