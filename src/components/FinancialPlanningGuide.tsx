import { plannerHref } from "../runtime/routes";

export function FinancialPlanningGuide() {
  return (
    <section
      id="financial-planning"
      className="planning-guide"
      aria-labelledby="financialPlanningTitle"
    >
      <h2 id="financialPlanningTitle">
        How to do financial planning, step by step
      </h2>
      <p className="planning-guide-intro">
        Start with what you earn, spend, own and owe. Set goals with dates, make
        a realistic monthly budget, build an emergency reserve, compare debt
        repayment options and plan investments for your time horizon. Review the
        plan as your life changes.
      </p>
      <ol className="planning-steps">
        <li>
          <h3>Understand your starting point</h3>
          <p>
            List your cash, investments and other assets alongside your
            outstanding loans. Assets minus liabilities gives your net worth.
            Then compare take-home income with expenses and required loan
            payments to see what your month can support.
          </p>
          <a href={plannerHref("custom-plan")}>
            Build a month-by-month financial plan →
          </a>
        </li>
        <li>
          <h3>Give your salary a monthly plan</h3>
          <p>
            Separate essentials such as rent, food and bills from flexible
            spending. Include upcoming annual bills, minimum EMIs and savings
            goals. Use actual spending to check whether your plan is realistic.
          </p>
          <a href={plannerHref("salary-budget")}>
            Plan your salary and monthly budget →
          </a>
        </li>
        <li>
          <h3>Set an emergency savings target</h3>
          <p>
            Choose a reserve based on essential costs, income stability and
            dependants. For example, four months of ₹25,000 in essential costs
            means a ₹1,00,000 target. This is an illustration; your target may
            differ. Keep emergency money accessible when needed.
          </p>
          <a href={plannerHref("salary-budget")}>
            Estimate your emergency savings gap →
          </a>
        </li>
        <li>
          <h3>Compare loan payoff with investing</h3>
          <p>
            List each balance, interest rate, EMI and prepayment charge. Compare
            highest-interest-first and smallest-balance-first repayment with
            investing the same extra money over the same period. Investment
            returns are uncertain; fees and tax assumptions can change the
            comparison.
          </p>
          <a href={plannerHref("loan-payoff")}>
            Compare loan payoff and investment paths →
          </a>
        </li>
        <li>
          <h3>Connect investments to your goals</h3>
          <p>
            Give each goal a target amount and date. Match investment choices to
            your time horizon and ability to accept losses, and consider
            diversification. Try different SIP amounts, returns and inflation
            assumptions rather than relying on one forecast.
          </p>
          <a href={plannerHref("growth")}>
            Explore a SIP investment projection →
          </a>
        </li>
        <li>
          <h3>Plan retirement and review regularly</h3>
          <p>
            Estimate future living costs and how savings could fund them.
            Compare inflation and return scenarios, then revisit your plan after
            income, family or debt changes. Also review insurance needs and
            beneficiary details; the calculators do not assess coverage or
            estate documents.
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
        </li>
      </ol>
      <div className="planning-example">
        <h3>What is the 50/30/20 budget rule?</h3>
        <p>
          It is a starting framework for splitting take-home pay: 50% for needs,
          30% for wants and 20% for savings and debt reduction. With ₹50,000 a
          month, that is ₹25,000, ₹15,000 and ₹10,000 respectively. Adjust the
          split for your required payments, living costs and goals; do not count
          the same EMI twice.
        </p>
        <p>
          The Salary Budget Planner uses your actual categories instead of
          forcing these percentages.
        </p>
      </div>
      <p className="planning-guide-sources">
        Further reading:{" "}
        <a href="https://www.consumerfinance.gov/consumer-tools/educator-tool/your-money-your-goals/toolkit/">
          CFPB goal-setting, budget and debt tools
        </a>
        ;{" "}
        <a href="https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/">
          CFPB emergency savings guide
        </a>
        ;{" "}
        <a href="https://files.consumerfinance.gov/f/documents/201606_cfpb_rules-to-live-by_my-spending-rule-to-live-by.pdf">
          CFPB spending-rule worksheet
        </a>
        ;{" "}
        <a href="https://www.investor.gov/introduction-investing/getting-started/asset-allocation">
          Investor.gov on investment risk and diversification
        </a>
        .
      </p>
      <p className="helper">
        Educational planning tools, not personalised financial advice.
        Projections use your assumptions and cannot guarantee returns. Tax
        treatment, insurance and legal arrangements depend on your circumstances
        and location.
      </p>
    </section>
  );
}
