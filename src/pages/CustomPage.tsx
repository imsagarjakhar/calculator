import { PlannerNavigation } from "../components/PlannerNavigation";
import { DateInput } from "../components/DateInput";
import { memo } from "react";
import { PlannerHeader } from "../components/PlannerHeader";
import { usePlanner } from "../runtime/usePlanner";
import mount from "planner:controller:custom";
export const CustomPage = memo(function CustomPage() {
  const ref = usePlanner(mount);
  return (
    <div ref={ref}>
      <main className="planner-page">
        <PlannerNavigation />
        <PlannerHeader kind="custom" />

        <p id="status" className="status" role="status"></p>
        <p id="error" className="error" role="alert" hidden></p>
        <section id="importPreview" className="card import-preview" hidden>
          <h2>Review this plan</h2>
          <p id="importDescription"></p>
          <p className="muted">
            Using this plan replaces the Custom Plan currently open here. Your
            Growth and Survival inputs stay separate. Save your current plan
            file first if you want to keep it.
          </p>
          <div className="actions">
            <button id="confirmImport" className="primary" type="button">
              Use this plan
            </button>
            <button id="cancelImport" type="button">
              Cancel
            </button>
          </div>
        </section>
        <section className="card" aria-labelledby="defaultsTitle">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / SET THE BASELINE</p>
              <h2 id="defaultsTitle">Your starting plan</h2>
            </div>
            <span id="saveState" className="badge">
              Private · browser saved
            </span>
          </div>
          <form id="settingsForm">
            <div className="fields settings-fields">
              <label>
                Plan name
                <input id="planName" maxLength={80} required />
              </label>
              <label>
                Starting month
                <DateInput
                  id="startMonth"
                  type="month"
                  min="2000-01"
                  max="2150-12"
                  required
                  placeholder="YYYY-MM"
                />
              </label>
              <label>
                End month
                <DateInput
                  id="endMonth"
                  type="month"
                  required
                  aria-describedby="durationHint"
                  placeholder="YYYY-MM"
                />
                <span id="durationHint" className="helper"></span>
              </label>
              <label htmlFor="targetToday">
                Target amount (today’s value)
                <input
                  id="targetToday"
                  type="number"
                  min="0"
                  max="1000000000000000"
                  step="any"
                  required
                  aria-describedby="targetFutureHint"
                />
                <span id="targetFutureHint" className="helper"></span>
              </label>
              <label>
                Default monthly SIP
                <input
                  id="defaultSip"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="any"
                  required
                />
              </label>
              <label>
                Annual SIP step-up (%)
                <input
                  id="stepup"
                  type="number"
                  min="0"
                  max="30"
                  step="any"
                  required
                />
              </label>
              <label>
                Expense inflation (%)
                <input
                  id="inflation"
                  type="number"
                  min="0"
                  max="30"
                  step="any"
                  required
                />
              </label>
              <label>
                SIP goes into<select id="sipTarget" required></select>
              </label>
            </div>
            <p id="settingsUpdateStatus" className="helper" role="status">
              Updates automatically · Saved in this browser.
            </p>
          </form>
          <p className="helper">
            Enter asset and loan balances as of the starting month.
          </p>
          <details className="planner-explanation">
            <summary>Dates, imports &amp; currency</summary>
            <p>
              Changing the start month keeps entries on their original dates.
              Imports restore the original plan without advancing dates or
              balances. Currency changes labels without converting amounts.
            </p>
          </details>
        </section>
        <div className="two-columns">
          <section className="card" aria-labelledby="assetsTitle">
            <p className="eyebrow">02 / WHAT YOU OWN</p>
            <h2 id="assetsTitle">Assets &amp; investment accounts</h2>
            <p className="helper">
              Use a zero starting value for a new stock or fund account you will
              invest in later.
            </p>
            <form id="assetForm">
              <div className="fields">
                <label>
                  Asset name
                  <input
                    id="assetName"
                    maxLength={80}
                    required
                    placeholder="e.g. Stocks"
                  />
                </label>
                <label>
                  Asset class
                  <select id="assetType">
                    <option>Mutual fund</option>
                    <option>Stocks</option>
                    <option>Fixed deposit</option>
                    <option>Gold</option>
                    <option>Gold ETF</option>
                    <option>Silver ETF</option>
                    <option>ETF</option>
                    <option>Cash</option>
                    <option>Property</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  Value at start
                  <input
                    id="assetValue"
                    type="number"
                    min="0"
                    max="1000000000000"
                    step="any"
                    required
                  />
                </label>
                <label>
                  Annual return / CAGR (%)
                  <input
                    id="assetReturn"
                    type="number"
                    min="-50"
                    max="60"
                    step="any"
                    required
                    placeholder="Your assumption"
                  />
                </label>
                <label className="wide">
                  Can you sell this asset if needed?
                  <select id="assetLiquid">
                    <option value="yes">
                      Yes — available for expenses and loan payments
                    </option>
                    <option value="no">
                      No — keep untouched / inheritance
                    </option>
                  </select>
                </label>
              </div>
              <div className="actions">
                <button id="assetSubmit" type="submit">
                  Add asset
                </button>
                <button id="assetCancel" type="button" hidden>
                  Cancel edit
                </button>
              </div>
            </form>
            <div id="assetList" className="entries"></div>
          </section>
          <section className="card" aria-labelledby="loansTitle">
            <p className="eyebrow">03 / WHAT YOU OWE</p>
            <h2 id="loansTitle">Current loans</h2>
            <p className="helper">
              Estimate from the original loan, or enter your lender’s current
              balance.
            </p>
            <form id="loanForm">
              <div className="fields">
                <label>
                  Loan name
                  <input
                    id="loanName"
                    maxLength={80}
                    required
                    placeholder="e.g. Home loan"
                  />
                </label>
                <label>
                  Enter loan using
                  <select id="loanMode">
                    <option value="original">
                      Original amount &amp; dates
                    </option>
                    <option value="current">Current outstanding balance</option>
                  </select>
                </label>
                <label id="loanOriginalLabel">
                  Starting loan amount
                  <input
                    id="loanOriginal"
                    type="number"
                    min="0.01"
                    max="1000000000000"
                    step="any"
                    required
                  />
                </label>
                <label>
                  Annual loan interest (%)
                  <input
                    id="loanRate"
                    type="number"
                    min="0"
                    max="60"
                    step="any"
                    required
                  />
                </label>
                <label id="loanYearsLabel">
                  Total tenure — years
                  <input
                    id="loanYears"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                    defaultValue="0"
                  />
                </label>
                <label id="loanExtraMonthsLabel">
                  Additional months
                  <input
                    id="loanExtraMonths"
                    type="number"
                    min="0"
                    max="11"
                    step="1"
                    required
                    defaultValue="0"
                  />
                </label>
                <label id="loanStartLabel">
                  Loan start date
                  <DateInput
                    id="loanStartDate"
                    type="date"
                    min="1900-01-01"
                    max="2250-12-31"
                    required
                    placeholder="YYYY-MM-DD"
                  />
                </label>
                <label id="loanCurrentLabel">
                  Current date / balance as of
                  <DateInput
                    id="loanCurrentDate"
                    type="date"
                    min="1900-01-01"
                    max="2250-12-31"
                    required
                    placeholder="YYYY-MM-DD"
                  />
                </label>
                <label id="loanPaidLabel">
                  Paid months
                  <input
                    id="loanPaidMonths"
                    readOnly
                    placeholder="Calculated automatically"
                  />
                </label>
                <label>
                  Outstanding balance
                  <input
                    id="loanBalance"
                    type="number"
                    min="0"
                    max="1000000000000"
                    step="any"
                    readOnly
                    required
                  />
                </label>
                <label>
                  Remaining EMIs (months)
                  <input
                    id="loanMonths"
                    type="number"
                    min="0"
                    max="1200"
                    step="1"
                    readOnly
                    required
                  />
                </label>
                <label>
                  Monthly EMI amount
                  <input
                    id="loanEmi"
                    readOnly
                    placeholder="Calculated automatically"
                  />
                </label>
                <label>
                  Remaining EMI payments total
                  <input
                    id="loanRemainingTotal"
                    readOnly
                    placeholder="Includes remaining interest"
                  />
                </label>
                <label>
                  How will you pay the EMI?
                  <select id="loanSource">
                    <option value="income">From salary or other income</option>
                    <option value="investments">
                      By withdrawing from investments
                    </option>
                  </select>
                </label>
              </div>
              <p
                id="loanCalculation"
                className="helper"
                role="status"
                aria-live="polite"
              ></p>
              <p className="helper">
                Had missed payments, fees or past prepayments? Use your lender’s
                outstanding balance.
              </p>
              <details className="planner-explanation">
                <summary>How the loan estimate works</summary>
                <p>
                  Assumes fixed interest and on-time EMIs, starting one month
                  after the loan date. Shorter months use their last day. The
                  balance applies at your plan’s starting month; align it with
                  the balance date. Schedule future extra payments below.
                </p>
              </details>
              <div className="actions">
                <button id="loanSubmit" type="submit">
                  Add loan
                </button>
                <button id="loanCancel" type="button" hidden>
                  Cancel edit
                </button>
              </div>
            </form>
            <div id="loanList" className="entries"></div>
          </section>
        </div>
        <section
          id="summary"
          className="summary"
          aria-label="Projected results"
          aria-live="polite"
        ></section>
        <section className="card" aria-labelledby="monthlyTitle">
          <div className="section-heading">
            <div>
              <p className="eyebrow">04 / MAKE IT YOURS</p>
              <h2 id="monthlyTitle">Your monthly plan</h2>
              <p className="helper">
                Edit a month’s SIP: leave blank for the default, or enter 0 to
                skip. Recorded months use your actual transactions.
              </p>
            </div>
            <label>
              View plan year<select id="yearView"></select>
            </label>
          </div>
          <p id="outsideNote" className="helper"></p>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Editable monthly plan"
          >
            <table>
              <caption className="sr-only">
                Monthly SIP, extra investments, loan payments, expenses, and
                projected assets and debt
              </caption>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>SIP / recorded amount</th>
                  <th>Extra invested</th>
                  <th>Recorded investments</th>
                  <th>EMI paid</th>
                  <th>Extra loan paid</th>
                  <th>Expenses funded</th>
                  <th>Shortfall</th>
                  <th>Assets</th>
                  <th>Debt</th>
                  <th>Net wealth</th>
                  <th>Cash flows</th>
                </tr>
              </thead>
              <tbody id="monthlyRows"></tbody>
            </table>
          </div>
          <div className="actions">
            <button id="exportCsv" type="button">
              Download schedule CSV
            </button>
            <span className="helper">
              CSV is for reviewing results. Use “Download report” or “Save JSON”
              for a file you can import and edit.
            </span>
          </div>
        </section>
        <section
          id="transactionHistory"
          className="card transaction-history"
          aria-labelledby="transactionTitle"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">04 / WHERE YOUR MONEY WENT</p>
              <h2 id="transactionTitle">Your investment transactions</h2>
              <p className="helper">
                Track actual contributions by investment account.
              </p>
            </div>
            <button id="transactionCsv" type="button">
              Download history CSV
            </button>
          </div>
          <div className="transaction-rule">
            <strong>Recorded month = your actual investments</strong>
            <p className="helper">
              Transactions replace that month’s planned SIP and extras. Loans
              and expenses still apply. Delete the last record to restore the
              forecast.
            </p>
          </div>
          <form id="transactionForm">
            <div className="fields flow-fields">
              <label htmlFor="transactionDate">
                Investment date
                <DateInput
                  id="transactionDate"
                  type="date"
                  min="2000-01-01"
                  max="2250-12-31"
                  required
                  placeholder="YYYY-MM-DD"
                />
              </label>
              <label htmlFor="transactionAsset">
                Where did you invest?
                <input
                  id="transactionAsset"
                  type="text"
                  maxLength={125}
                  placeholder="e.g. Reliance stocks, Gold ETF, my mutual fund"
                  required
                  autoComplete="off"
                  aria-describedby="transactionAccountHint"
                />
              </label>
              <label htmlFor="transactionAmount">
                Amount invested
                <input
                  id="transactionAmount"
                  type="number"
                  min="0.01"
                  max="1000000000000"
                  step="any"
                  required
                />
              </label>
              <label htmlFor="transactionNote">
                Note / reference
                <input
                  id="transactionNote"
                  maxLength={200}
                  placeholder="e.g. Salary allocation or order reference"
                />
              </label>
            </div>
            <p id="transactionAccountHint" className="helper">
              Type where you invested. An existing name reuses that account; a
              new name creates one.
            </p>
            <div id="transactionNewFields" className="fields" hidden>
              <label htmlFor="transactionNewCategory">
                Investment category
                <input
                  id="transactionNewCategory"
                  maxLength={40}
                  placeholder="e.g. Stocks, Mutual fund, Gold ETF"
                  defaultValue="Other"
                />
              </label>
              <label htmlFor="transactionNewReturn">
                Expected annual return (%)
                <input
                  id="transactionNewReturn"
                  type="number"
                  min="-50"
                  max="60"
                  step="any"
                  defaultValue="0"
                />
                <span className="helper">
                  For the new account’s projected growth. 0% assumes no growth.
                </span>
              </label>
            </div>
            <p className="helper">
              Record contributions after the plan starts; earlier investments
              belong in starting balances.
            </p>
            <details className="planner-explanation">
              <summary>How transactions affect your projection</summary>
              <p>
                New accounts start at zero using the category and return entered
                here. History keeps exact dates; projections and XIRR place
                deposits at month-end. This tracks invested amounts, not units
                or live market prices.
              </p>
            </details>
            <div className="actions">
              <button id="transactionSubmit" className="primary" type="submit">
                Add transaction
              </button>
              <button id="transactionCancel" type="button" hidden>
                Cancel edit
              </button>
            </div>
            <p id="transactionError" className="error" role="alert"></p>
          </form>
          <div className="transaction-filters">
            <label htmlFor="transactionMonthFilter">
              Filter by month
              <DateInput
                id="transactionMonthFilter"
                type="month"
                min="2000-01"
                max="2250-12"
                placeholder="YYYY-MM"
              />
            </label>
            <label htmlFor="transactionAssetFilter">
              Filter by account<select id="transactionAssetFilter"></select>
            </label>
            <button id="transactionClearFilters" type="button">
              Show all transactions
            </button>
          </div>
          <p id="transactionTotals" className="helper" role="status"></p>
          <div
            id="transactionCategories"
            className="transaction-categories"
          ></div>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Investment transaction history"
          >
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Investment account</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th>Plan status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="transactionRows"></tbody>
            </table>
          </div>
        </section>
        <section className="card month-editor" aria-labelledby="monthTitle">
          <div className="section-heading">
            <div>
              <p className="eyebrow">05 / EXTRA MONEY &amp; LIFE EVENTS</p>
              <h2 id="monthTitle">Add or update a month's cash flows</h2>
            </div>
            <label>
              Choose month
              <DateInput
                id="editMonth"
                type="month"
                min="2000-01"
                max="2250-12"
                required
                placeholder="YYYY-MM"
              />
            </label>
          </div>
          <p id="monthContext" className="helper"></p>
          <form id="flowForm">
            <div className="fields flow-fields">
              <label>
                What happened?
                <select id="flowType">
                  <option value="investment">Extra investment / bonus</option>
                  <option value="prepayment">Extra loan payment</option>
                  <option value="expense">One-time expense</option>
                </select>
              </label>
              <label id="flowTargetLabel">
                Invest into<select id="flowTarget"></select>
              </label>
              <label>
                Amount
                <input
                  id="flowAmount"
                  type="number"
                  min="0.01"
                  max="1000000000000"
                  step="any"
                  required
                />
              </label>
              <label>
                Note
                <input
                  id="flowNote"
                  maxLength={200}
                  placeholder="e.g. Bonus invested in stocks"
                />
              </label>
              <label id="flowSourceLabel" hidden>
                Payment source
                <select id="flowSource">
                  <option value="income">
                    Salary / bonus — outside investments
                  </option>
                  <option value="investments">Withdraw from investments</option>
                </select>
              </label>
              <label id="flowInflationLabel" hidden>
                Amount is
                <select id="flowInflation">
                  <option value="future">The cost at this event</option>
                  <option value="today">Today's cost — add inflation</option>
                </select>
              </label>
            </div>
            <div className="actions">
              <button id="flowSubmit" type="submit">
                Add cash flow
              </button>
              <button id="flowCancel" type="button" hidden>
                Cancel edit
              </button>
            </div>
          </form>
          <div id="flowList" className="entries"></div>
        </section>
        <section className="card">
          <p className="eyebrow">06 / SEE THE EFFECT</p>
          <h2>Your projected net wealth</h2>
          <div id="chart"></div>
          <details>
            <summary>Year-by-year summary</summary>
            <div
              className="table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Year-by-year custom plan summary"
            >
              <table>
                <thead>
                  <tr>
                    <th>Plan year</th>
                    <th>New investments</th>
                    <th>Loan payments</th>
                    <th>Expenses</th>
                    <th>Assets</th>
                    <th>Debt</th>
                    <th>Net wealth</th>
                  </tr>
                </thead>
                <tbody id="yearRows"></tbody>
              </table>
            </div>
          </details>
        </section>
        <details className="card methods">
          <summary>Calculation method &amp; using your plan file</summary>
          <p>
            Each asset grows monthly at the monthly equivalent of its effective
            annual return. SIPs and extra investments enter at month-end and
            begin earning returns the following month. A SIP override replaces
            that month's regular contribution; it does not change other months
            or your annual step-up schedule.
          </p>
          <p>
            Monthly order: investment returns, SIP and extra deposits, loan
            interest and scheduled EMIs, extra loan payments, then one-time
            expenses. Income-funded payments are assumed affordable from
            salary/bonus outside this model; enter your SIP after those
            commitments. Investment-funded payments and expenses use
            withdrawable assets, with the SIP account first and other accounts
            in listed order. Retained assets count toward net wealth but cannot
            fund payments.
          </p>
          <p>
            Loans use fixed interest at annual rate ÷ 12 and a calculated level
            EMI. Extra payments keep the EMI unchanged and shorten repayment.
            The final payment is capped at debt due. A requested prepayment
            above the debt is unused and is not automatically invested
            elsewhere. Missed investment-funded payments remain in debt and
            continue accruing interest. Expense shortfalls are reported without
            creating new debt. No lender fees, rate changes, penalties, taxes or
            transaction costs are modelled.
          </p>
          <p>
            Exported JSON contains your starting inputs, asset and loan details,
            monthly SIP overrides and dated cash flows. Imported files are
            validated and previewed before use. Calculated results are
            regenerated. Keep your saved file private. Browser saving is a
            convenience; downloaded plan files are your backup. If you later
            update current asset or loan balances, also set the starting month
            to the date those balances represent. Earlier monthly changes are
            retained outside the new horizon and excluded; future changes stay
            on their calendar months. Transaction history preserves recorded
            investment contributions. The model does not track units or actual
            market prices.
          </p>
          <p>
            Combined XIRR measures all investment accounts, including assets
            kept untouched. Starting holdings are valued immediately before the
            starting month; SIPs, extra deposits and funded withdrawals are
            dated at month-end, with final asset value as the last proceeds.
            Loan balances and income-funded loan payments are excluded. This is
            projected performance from plan start, not the historical return on
            your original purchases. It uses the{" "}
            <a
              href="https://support.microsoft.com/en-us/excel/functions/xirr-function"
              target="_blank"
              rel="noopener noreferrer"
            >
              actual-day / 365 XIRR convention
            </a>
            . Unavailable or multiple solutions show no single rate.
          </p>
          <p>
            Absolute return includes investment gains on starting holdings and
            new contributions, plus money withdrawn for expenses or loans.
            Inflation-adjusted net worth is ending net worth at plan-start
            prices. Inflation-adjusted gains discount each contribution,
            withdrawal and final asset value to plan-start prices; the
            percentage uses inflation-adjusted invested capital.
          </p>
          <p>
            All results use fixed assumptions and are planning illustrations. A
            positive net wealth can include assets you cannot spend.
          </p>
        </details>
        <footer>
          Calculations run in your browser · Separate from Growth and Survival ·
          No account needed
        </footer>
      </main>
    </div>
  );
});
