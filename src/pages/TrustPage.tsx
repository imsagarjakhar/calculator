import { PlannerNavigation } from "../components/PlannerNavigation";
import { plannerHref } from "../runtime/routes";
import { publisher } from "../content/publisher";

export type TrustRoute = "about" | "privacy" | "methodology" | "contact";
const titles = {
  contact: "A question? A calculation to check?",
  about: "Know the tools behind your plan.",
  privacy: "Your numbers. Your control.",
  methodology: "Understand the estimate.",
};
const intros = {
  contact:
    "Contact Financial AI Planner about the tools, accessibility, privacy or a correction. Use sample numbers to protect your financial information.",
  about:
    "Financial AI Planner helps you explore budgets, investing, loans and retirement before making a decision.",
  privacy:
    "Calculator entries are processed in your browser. This policy explains browser storage, reports, public content and advertising.",
  methodology:
    "A useful projection makes its assumptions visible. Here is how to read our models, compare scenarios and check the limits.",
};
function Contact() {
  return publisher.contactEmail ? (
    <section id="contact" className="trust-contact">
      <h2>Contact &amp; corrections</h2>
      <p>
        Contact {publisher.name} at{" "}
        <a href={`mailto:${publisher.contactEmail}`}>
          {publisher.contactEmail}
        </a>
        . For a calculation issue, include the planner, currency and a small
        example using invented numbers. Never email passwords, bank details or
        your private plan.
      </p>
    </section>
  ) : null;
}
export function TrustPage({ page }: { page: TrustRoute }) {
  return (
    <main className="planner-page trust-page">
      <PlannerNavigation />
      <header className="trust-header">
        <p className="trust-kicker">
          {page === "about"
            ? "About this website"
            : page === "privacy"
              ? "Privacy policy"
              : page === "contact"
                ? "Contact"
                : "Methods & limitations"}
        </p>
        <h1>{titles[page]}</h1>
        <p>{intros[page]}</p>
        <nav aria-label="About this website">
          <a
            href={plannerHref("contact")}
            aria-current={page === "contact" ? "page" : undefined}
          >
            Contact
          </a>
          <a
            href={plannerHref("about")}
            aria-current={page === "about" ? "page" : undefined}
          >
            About
          </a>
          <a
            href={plannerHref("methodology")}
            aria-current={page === "methodology" ? "page" : undefined}
          >
            Calculation methods
          </a>
          <a
            href={plannerHref("privacy")}
            aria-current={page === "privacy" ? "page" : undefined}
          >
            Privacy
          </a>
        </nav>
      </header>
      <article className="trust-content">
        {page === "contact" && (
          <>
            <Contact />
            <details open>
              <summary>Help us reproduce a calculation</summary>
              <p>
                Tell us which planner and currency you used, what you entered
                using invented example amounts, the result you expected and what
                appeared instead. Include your browser and whether it happened
                on a phone or computer. A cropped screenshot is useful if it
                contains no private details.
              </p>
            </details>
            <details>
              <summary>Privacy &amp; accessibility questions</summary>
              <p>
                You can use the same address to ask about browser storage,
                report handling or an accessibility barrier. Email is handled by
                the email service and can contain personal information you
                choose to send. Do not include financial account numbers,
                passwords, identity documents or full report files.
              </p>
              <a href={plannerHref("privacy")}>Read the privacy policy →</a>
            </details>
            <details>
              <summary>What this contact channel can help with</summary>
              <p>
                We welcome website feedback and corrections. This is not a
                channel for personalised investment recommendations, account
                recovery with a bank, or urgent financial assistance. We do not
                promise an individual plan review or a response time.
              </p>
            </details>
          </>
        )}
        {page === "about" && (
          <>
            <section>
              <h2>Built for understanding</h2>
              <p>
                Start with what you earn, own, owe or want to spend. Compare a
                few realistic assumptions, inspect the chart and monthly
                schedule, then keep a report. Use the tools without
                a visitor account.
              </p>
            </section>
            <div className="trust-cards">
              <section>
                <span aria-hidden="true">01</span>
                <h2>Plan your month</h2>
                <p>
                  Separate spending, upcoming bills and protected savings before
                  investing the remainder.
                </p>
                <a href={plannerHref("salary-budget")}>
                  Try the budget planner →
                </a>
              </section>
              <section>
                <span aria-hidden="true">02</span>
                <h2>Compare your options</h2>
                <p>
                  Explore SIP growth, loan repayment or retirement income using
                  the same assumptions.
                </p>
                <a href={plannerHref("loan-payoff")}>
                  Compare repayment and investing →
                </a>
              </section>
              <section>
                <span aria-hidden="true">03</span>
                <h2>Learn as you go</h2>
                <p>
                  Try visual explanations of SIP, SWP, interest and inflation
                  before building a plan.
                </p>
                <a href={plannerHref("learn")}>Explore finance basics →</a>
              </section>
            </div>
            <details open>
              <summary>What does “AI” mean in the name?</summary>
              <p>
                The calculators use programmed financial formulas and the values
                you enter. They do not use generative AI to choose investments,
                predict prices or produce personalised financial advice. The
                site name is a product name, not a claim that an AI or adviser
                has reviewed your plan.
              </p>
            </details>
            <details>
              <summary>Who is this for—and what should I check?</summary>
              <p>
                These are educational planning tools for people comparing their
                own scenarios. Currency selection changes formatting; it does
                not convert amounts or apply a country's tax, pension or
                investment rules. Check local product terms and consult a
                suitably qualified adviser for a personal decision.
              </p>
            </details>
            <details>
              <summary>How do you check the calculations?</summary>
              <p>
                The project includes automated checks for cash-flow
                reconciliation, loan amortisation, timing boundaries, inflation,
                report restoration and browser interactions. These checks help
                catch software errors; they do not validate future returns or
                certify a financial plan. Each planner includes its own
                assumptions and limitations.
              </p>
              <a href={plannerHref("methodology")}>
                Read the calculation guide →
              </a>
            </details>
            <Contact />
          </>
        )}
        {page === "privacy" && (
          <>
            <p className="trust-date">Policy updated: 25 October 2026</p>
            <section>
              <h2>Calculator entries &amp; reports</h2>
              <p>
                Salary, expense, asset, loan and investment values are
                calculated locally. The calculators do not upload these entries
                or imported reports to our publishing service. Downloaded
                reports may contain your complete inputs. Keep them private,
                especially on shared devices.
              </p>
            </section>
            <details open>
              <summary>What stays in this browser?</summary>
              <p>
                We use browser local storage for currency preferences and saved
                planner values. The salary planner opens at zero on each visit
                and restores inputs only when you import a report. The loan
                planner uses the repayment amount you enter; it does not import
                your salary budget.
              </p>
              <p>
                Other planners may restore their saved browser copy. Browser
                storage is not an account or a cloud backup. You can remove it
                through your browser's site-data settings. Clearing it can
                remove saved plans and preferences, so download a report first.
                Reset behaviour is described in each planner.
              </p>
            </details>
            <details>
              <summary>What information do website services receive?</summary>
              <p>
                Loading this website sends ordinary connection information, such
                as your IP address, browser details and requested URL, to
                hosting and network providers. Reading the blog requests public
                posts from the publishing service or content host. Header search
                matches text in the browser; calculator entries are not included
                in those public-content requests.
              </p>
              <p>
                Only the site publisher uses the publishing login. It sends
                authentication details to the publishing API to manage public
                posts. Visitor calculators do not require this login. External
                links and videos open other providers, whose own privacy
                policies apply.
              </p>
            </details>
            <details open>
              <summary>Google advertising &amp; cookies</summary>
              <p>
                The site is intended to be supported by advertising. Where
                Google ads are served, third-party vendors, including Google,
                use cookies to serve ads based on your prior visits to this
                website or other websites. Google's advertising cookies enable
                Google and its partners to personalise ads using those visits.
              </p>
              <p>
                You can manage or opt out of personalised Google advertising in{" "}
                <a href="https://myadcenter.google.com/">My Ad Center</a>, and
                find participating vendors' choices at{" "}
                <a href="https://optout.aboutads.info/">YourAdChoices</a>. Read{" "}
                <a href="https://policies.google.com/technologies/partner-sites">
                  how Google uses information from partner sites
                </a>
                . Browser cookie settings provide additional controls; disabling
                personalisation does not necessarily remove all advertising or
                cookies.
              </p>
              <p>
                Advertising, if enabled, must respect applicable consent
                choices. A cookie preference does not delete calculator values
                held in local storage. Financial inputs and report files are not
                intentionally supplied as advertising data.
              </p>
            </details>
            <details>
              <summary>Changes &amp; questions</summary>
              <p>
                This policy must be updated if data practices, advertising
                vendors or website services change. The date above identifies
                this version. Do not send private reports or financial account
                information in a support request.
              </p>
            </details>
            <Contact />
          </>
        )}
        {page === "methodology" && (
          <>
            <section>
              <h2>Three checks before trusting a result</h2>
              <ol className="trust-checks">
                <li>
                  <strong>Separate contributions from growth.</strong> Adding
                  money increases the balance without being an investment
                  return.
                </li>
                <li>
                  <strong>Compare purchasing power.</strong> Future money and
                  today's money are different when prices rise.
                </li>
                <li>
                  <strong>Test a lower return.</strong> A smooth chart is an
                  assumption, not the path markets will follow.
                </li>
              </ol>
            </section>
            <details open>
              <summary>Monthly investing: SIP &amp; annual step-ups</summary>
              <p>
                A SIP is a regular contribution, not a product with a guaranteed
                yield. In the Growth planner, contributions enter at month-end.
                An annual rate input is divided by 12 for monthly compounding,
                and the step-up changes the contribution once a year. That
                nominal-rate convention differs from an effective annual return:
                a 12% input compounds to about 12.68% over a year.
              </p>
              <p>
                The salary goal forecast uses an effective annual return
                converted to a monthly rate instead. Compare the stated
                convention as well as the percentage. Each planner's model notes
                describe its timing.
              </p>
              <a href={plannerHref("growth")}>Check the Growth schedule →</a>
            </details>
            <details>
              <summary>Retirement: SWP, FIRE &amp; buckets</summary>
              <p>
                A SWP is a withdrawal schedule; it can include spending your
                capital. The Survival planner tests how a pot changes under
                withdrawals and inflation. The Freedom planner estimates an
                income goal or a selected 2–6% annual withdrawal from projected
                corpus; its default 3% is an input, not a universally safe rate.
                The bucket planner separates living costs, emergency reserves
                and long-term investments with modelled refills.
              </p>
              <p>
                Steady assumed returns cannot capture the order of real market
                gains and losses. A goal crossing does not guarantee lifelong
                funding. Review the model horizon, one-off expenses, tax and
                costs.
              </p>
              <a href={plannerHref("freedom")}>Explore an income scenario →</a>
            </details>
            <details>
              <summary>Loans: repayment versus investing</summary>
              <p>
                Compare the alternatives using the same monthly budget. Loan
                interest uses the loan's outstanding balance and repayment
                terms; investment growth is uncertain. Prepayment charges, tax,
                lost rental income and sale costs can change the comparison.
                Required EMIs are paid before any extra repayment allocation.
              </p>
              <p>
                A higher projected investment value does not make an investment
                certain to outperform a loan. The planner shows scenarios, not a
                recommendation to borrow, buy or sell an asset.
              </p>
              <a href={plannerHref("loan-payoff")}>
                Inspect a loan comparison →
              </a>
            </details>
            <details>
              <summary>Source references &amp; limits</summary>
              <p>
                For background, see the{" "}
                <a href="https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator">
                  Investor.gov compound-interest calculator
                </a>
                ,{" "}
                <a href="https://www.investor.gov/introduction-investing/investing-basics/glossary/purchasing-power">
                  inflation and purchasing power
                </a>
                , and the{" "}
                <a href="https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/">
                  CFPB explanation of amortisation
                </a>
                . These sources explain concepts; they do not endorse or certify
                this website.
              </p>
              <p>
                Results depend on your inputs. Taxes, fees, market fluctuations
                and local rules may not be fully modelled. Currency selection is
                formatting, not foreign-exchange conversion. Check the
                assumptions inside the planner you use and verify important
                decisions independently.
              </p>
            </details>
            <Contact />
          </>
        )}
      </article>
    </main>
  );
}
