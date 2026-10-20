export function HomeContent() {
  return (
    <section id="homeScreen" className="welcome" aria-labelledby="welcomeTitle">
      <div className="eyebrow">
        LEARN WITH INTIMETEC / YOUR MONEY, IN PERSPECTIVE
      </div>
      <div className="welcome-intro">
        <span className="welcome-kicker">Intimetec Money Planner</span>
        <h1 id="welcomeTitle" tabIndex={-1}>
          Build your wealth.
          <br />
          Make it last.
        </h1>
        <p>
          Use Intimetec’s free SIP, loan, retirement and financial freedom
          calculators to explore investment growth, monthly EMIs, savings
          longevity and when work could become a choice.
        </p>
      </div>
      <div className="planner-choices has-custom has-freedom">
        <button
          type="button"
          className="choice growth-choice"
          data-screen="growth"
        >
          <span className="choice-icon" aria-hidden="true">
            ↗
          </span>
          <span className="eyebrow">01 / BUILD YOUR WEALTH</span>
          <strong>Check Growth</strong>
          <span className="choice-copy">
            See where your SIP can take you, with annual step-ups and extra
            investments along the way.
          </span>
          <span className="choice-link">
            Open SIP planner <span aria-hidden="true">↗</span>
          </span>
        </button>
        <button
          type="button"
          className="choice survival-choice"
          data-screen="survival"
        >
          <span className="choice-icon" aria-hidden="true">
            ◷
          </span>
          <span className="eyebrow">02 / MAKE IT LAST</span>
          <strong>Check Survival</strong>
          <span className="choice-copy">
            Start with your current corpus. See how withdrawals, inflation and
            returns shape its lifetime.
          </span>
          <span className="choice-link">
            Explore corpus survival <span aria-hidden="true">↗</span>
          </span>
        </button>
        <a className="choice custom-choice" href="custom-plan.html">
          <span className="choice-icon" aria-hidden="true">
            ✎
          </span>
          <span className="eyebrow">03 / YOUR PLAN, YOUR WAY</span>
          <strong>Custom Plan</strong>
          <span className="choice-copy">
            Adjust any month's SIP, invest a bonus, or pay a loan sooner. Save
            your plan and pick it up later.
          </span>
          <span className="choice-link">
            Build a monthly plan <span aria-hidden="true">↗</span>
          </span>
        </a>
        <a className="choice freedom-choice" href="freedom.html">
          <span className="choice-icon" aria-hidden="true">
            ◎
          </span>
          <span className="eyebrow">04 / MAKE WORK A CHOICE</span>
          <strong>Financial Freedom</strong>
          <span className="choice-copy">
            Set your monthly SIP and desired monthly income. Adjust step-up,
            inflation and expected return to explore your freedom age.
          </span>
          <span className="choice-link">
            Find my freedom age <span aria-hidden="true">↗</span>
          </span>
        </a>
        <a className="choice bucket-choice" href="bucket-plan.html">
          <span className="choice-icon" aria-hidden="true">
            <svg
              viewBox="0 0 48 48"
              width="34"
              height="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 17C13 2 35 2 35 17M9 17l5 24q10 5 20 0l5-24"></path>
              <ellipse cx="24" cy="17" rx="15" ry="4"></ellipse>
              <path d="M13 30q11 5 22 0"></path>
            </svg>
          </span>
          <span className="eyebrow">
            05 / GIVE YOUR RETIREMENT MONEY A PLAN
          </span>
          <strong>Retirement Bucket Planner</strong>
          <span className="choice-copy">
            Split your savings into living costs, emergencies and long-term
            growth. Watch withdrawals, inflation and refills work month by
            month.
          </span>
          <span className="choice-link">
            Plan my retirement buckets <span aria-hidden="true">↗</span>
          </span>
        </a>
      </div>
      <section className="planner-guide" aria-labelledby="plannerGuideTitle">
        <h2 id="plannerGuideTitle">
          Plan investments, loans and retirement with Intimetec
        </h2>
        <p>
          Choose a calculator to explore your next money decision. Each tool
          lets you adjust assumptions and see how they affect your projected
          finances.
        </p>
        <h3>SIP and investment growth calculator</h3>
        <p>
          Use Check Growth to estimate future investment value from a monthly
          SIP, annual increases and one-time deposits. Include existing assets,
          loans and planned life expenses to explore projected net wealth.
        </p>
        <h3>Retirement withdrawals and savings calculator</h3>
        <p>
          Use Check Survival to estimate how long your current savings may
          support regular withdrawals. Adjust inflation, expected returns and
          future expenses to compare scenarios.
        </p>
        <h3>Financial freedom age calculator</h3>
        <p>
          <a href="freedom.html">Explore your financial freedom age</a> using
          your current corpus, monthly SIP, yearly step-up and desired monthly
          income. Change expected return and inflation to explore the modelled
          freedom age, including future expenses.
        </p>
        <h3>Loan EMI and monthly planning calculator</h3>
        <p>
          <a href="custom-plan.html">Open Intimetec Custom Plan</a> to enter an
          original loan amount, interest rate, total tenure and loan dates.
          Calculate paid months, remaining EMIs and estimated outstanding
          principal, then plan extra repayments alongside monthly investments.
        </p>
        <p className="helper">
          These tools provide educational illustrations using your assumptions.
          Actual returns, lender balances and payment schedules may differ.
          Calculations run in your browser; no account is needed.
        </p>
      </section>
      <p className="welcome-foot">
        Private by design. Calculations run in your browser. No sign-up.
      </p>
    </section>
  );
}
