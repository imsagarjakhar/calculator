import { plannerHref } from "../runtime/routes";
import { currencyMoney, useCurrency } from "../runtime/currency";
import "../styles/planning-guide.css";

export function FinancialPlanningGuide() {
  const currency = useCurrency();
  const money = (n: number) => currencyMoney(n, currency);
  return (
    <section
      id="financial-planning"
      className="planning-guide planning-guide--compact"
      aria-labelledby="financialPlanningTitle"
    >
      <h2 id="financialPlanningTitle">
        How to do financial planning, step by step
      </h2>
      <p className="planning-guide-intro">
        Six small steps. Open the one you need today.
      </p>
      <ol className="planning-steps">
        <li>
          <details>
            <summary>
              <h3>
                Know what you have
                <small>What you own, owe, earn and spend.</small>
              </h3>
            </summary>
            <div className="planning-step-detail">
              <p>
                Assets minus debts gives your net worth. Compare take-home
                income with expenses and loan payments to see what is left.
              </p>
              <a href={plannerHref("custom-plan")}>
                Build a month-by-month financial plan →
              </a>
            </div>
          </details>
        </li>
        <li>
          <details>
            <summary>
              <h3>
                Give your salary a plan
                <small>Cover your costs. Make room for goals.</small>
              </h3>
            </summary>
            <div className="planning-step-detail">
              <p>
                Include essentials, flexible spending, upcoming bills, minimum
                EMIs and savings. Check the plan against your actual spending.
              </p>
              <a href={plannerHref("salary-budget")}>
                Plan your salary and monthly budget →
              </a>
            </div>
          </details>
        </li>
        <li>
          <details>
            <summary>
              <h3>
                Build an emergency cushion
                <small>Keep a reserve for the unexpected.</small>
              </h3>
            </summary>
            <div className="planning-step-detail">
              <p>
                Four months of {money(25000)} in essential costs means a{" "}
                {money(100000)} reserve. This is an example: choose your target
                for your income stability and dependants. Keep it accessible.
              </p>
              <a href={plannerHref("salary-budget")}>
                Estimate your emergency savings gap →
              </a>
            </div>
          </details>
        </li>
        <li>
          <details>
            <summary>
              <h3>
                Compare debt and investing
                <small>See where your extra money could go.</small>
              </h3>
            </summary>
            <div className="planning-step-detail">
              <p>
                Compare paying high-interest or smaller loans first with
                investing the same extra money over the same period. Include
                prepayment charges, fees and taxes. Investment returns are
                uncertain.
              </p>
              <a href={plannerHref("loan-payoff")}>
                Compare loan payoff and investment paths →
              </a>
            </div>
          </details>
        </li>
        <li>
          <details>
            <summary>
              <h3>
                Put a date on your goals
                <small>Choose an amount and a timeline.</small>
              </h3>
            </summary>
            <div className="planning-step-detail">
              <p>
                Match investments to your time horizon and ability to accept
                losses. Consider diversification and try different SIP, return
                and inflation assumptions.
              </p>
              <a href={plannerHref("growth")}>
                Explore a SIP investment projection →
              </a>
            </div>
          </details>
        </li>
        <li>
          <details>
            <summary>
              <h3>
                Look ahead to retirement
                <small>Explore how savings could fund your life.</small>
              </h3>
            </summary>
            <div className="planning-step-detail">
              <p>
                Test future living costs, inflation and returns. Review after
                income, family or debt changes. Review insurance and beneficiary
                details too; these tools do not assess them.
              </p>
              <a href={plannerHref("survival")}>
                Estimate retirement withdrawals →
              </a>
              <a href={plannerHref("freedom")}>
                Explore your financial freedom age →
              </a>
              <a href={plannerHref("bucket-plan")}>
                Plan retirement spending buckets →
              </a>
            </div>
          </details>
        </li>
      </ol>
      <div className="planning-example">
        <div className="planning-example-heading">
          <h3>The 50/30/20 budget, at a glance.</h3>
          <p>
            Example take-home pay: <strong>{money(50000)} / month</strong>
          </p>
        </div>
        <div className="planning-budget-bar" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <dl className="planning-budget-split">
          <div>
            <dt>
              <span>50%</span> Needs
            </dt>
            <dd>{money(25000)}</dd>
          </div>
          <div>
            <dt>
              <span>30%</span> Wants
            </dt>
            <dd>{money(15000)}</dd>
          </div>
          <div>
            <dt>
              <span>20%</span> Savings &amp; debt reduction
            </dt>
            <dd>{money(10000)}</dd>
          </div>
        </dl>
        <p className="planning-budget-note">
          A starting point, not a fixed rule. Your budget should fit your life.
        </p>
        <details className="planning-budget-help">
          <summary>How to use this example</summary>
          <p>
            Adjust the split for your costs, required payments and goals. Do not
            count the same EMI twice. The Salary Budget Planner uses your actual
            categories instead of forcing these percentages.
          </p>
        </details>
      </div>
      <details className="planning-guide-sources">
        <summary>Sources &amp; planning limits</summary>
        <ul>
          <li>
            <a href="https://www.consumerfinance.gov/consumer-tools/educator-tool/your-money-your-goals/toolkit/">
              CFPB: goals, budgets and debt
            </a>
          </li>
          <li>
            <a href="https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/">
              CFPB: emergency savings
            </a>
          </li>
          <li>
            <a href="https://files.consumerfinance.gov/f/documents/201606_cfpb_rules-to-live-by_my-spending-rule-to-live-by.pdf">
              CFPB: spending-rule worksheet
            </a>
          </li>
          <li>
            <a href="https://www.investor.gov/introduction-investing/getting-started/asset-allocation">
              Investor.gov: risk and diversification
            </a>
          </li>
        </ul>
        <p>
          Educational tools, not personalised advice. Projections use your
          assumptions and cannot guarantee returns. Tax, insurance and legal
          needs depend on your circumstances and location.
        </p>
      </details>
    </section>
  );
}
