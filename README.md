# Growth & Survival Calculator

Open `index.html` in a browser. No build or external dependencies are required.

- **Check Growth:** starting assets, loans, SIP, annual step-up, extra investments, life expenses, and a net wealth goal.
- **Check Survival:** current corpus, age, monthly SWP, inflation, effective annual return, and end age, with estimated funded days, depletion age, a chart, yearly balances, and CSV download.

Survival spreads each month's SWP budget across its plan-month days, compounds the effective annual return daily, and increases the budget on each plan anniversary. It includes leap days and partial final-day coverage. It is a forward projection with fixed assumptions, not a historical backtest. Detailed assumptions are available below the calculator.

Inputs are stored locally when browser storage is available. Growth and Survival keep separate inputs. Currency amounts in Survival are entered directly without conversion.

Both calculators support optional life expenses: child education, weddings, home/car purchases, medical costs, renovations, travel, emergencies, and custom events. Set a plan year/month and enter either today's cost (inflated to the event month) or the future cost. Edit, pause/include, or remove entries to compare scenarios. Growth and Survival save separate expense lists for each currency; the Growth Reset button clears its lists across all currencies. The PPT example and Survival example resets retain life expenses.

Growth pays life expenses after each month's SIP, extra deposits, and EMIs; today's costs are inflated through that month-end. Unfunded costs are reported without creating debt; later SIP contributions continue. Survival pays expenses at the start of their plan month and stops at corpus depletion. Its unfunded summary includes later scheduled costs. The summaries compare each plan with the same assumptions and no life expenses. Yearly/monthly tables and CSV exports include funded expenses and shortfalls.

Run calculation checks with `node survival-engine.test.js`, `node life-events.test.js`, and `node calculation-audit.test.js`. The audit compares 100 Growth scenarios with independent future-value sums and 60 Survival scenarios with monthly geometric-sum formulas, and checks both calculators’ generated tables and CSV values. Survival uses months anchored to the start date (with month-end clamping) so each full year funds exactly twelve inflation-adjusted monthly budgets.

Growth also supports multiple existing assets (each with its own effective annual return / CAGR and withdrawal availability) and loans (outstanding principal, nominal annual interest, original total tenure, remaining months, automatically calculated EMI, and payment source). Net wealth equals all projected assets minus remaining loans; available funds exclude assets marked not for withdrawal. Income-funded EMIs do not reduce the investment pool: enter the SIP after EMI commitments. Investment-funded EMIs draw from the SIP pool, then withdrawable assets in listed order, before life expenses. Underfunded EMIs remain in the debt balance, which continues accruing interest. Payments stop after payoff and the final EMI is capped at debt due; SIPs stay unchanged after payoff. Rates are fixed and fees or penalties are not modelled. The Growth Reset button clears assets and loans; the PPT example keeps them; each currency has its own saved list.

Run `node growth-position.test.js` for asset compounding/depreciation, independent loan amortisation, payoff, negative amortisation, both EMI sources, unavailable assets, reconciliation, goals, and table/CSV checks.

For GitHub Pages, deploy `index.html`, `planner.css`, `life-events.js`, `growth-engine.js`, `growth-holdings.js`, `survival-engine.js`, and `survival.js` together. No build step is needed.

Loan EMI is calculated from the outstanding balance and remaining months using a reducing-balance annuity (or balance ÷ remaining months at 0% interest). Total tenure records the original term and must be at least the remaining term. EMI displays two decimal places; projections use full precision. Loan summaries show both the original schedule and the estimated months needed to repay debt at the end of the projection. Missed investment-funded payments can extend repayment. Previously saved manual-EMI loans are preserved; edit and enter tenure to switch them to automatic calculation. Run `node loan-tenure.test.js` for formula, tenure, payoff, live form, and migration checks.

Loans can also be entered from original details: original amount, fixed annual interest, original tenure in years plus months, and years/months already paid. The calculator derives the original EMI, estimated balance after completed payments, and remaining tenure, using full precision. This assumes on-time monthly payments with no prepayments, fees, or rate changes. The current-balance mode remains available for lender-confirmed figures. Fully paid loans have zero future debt and EMI. Run `node original-loan.test.js` for independent amortisation comparisons and form checks.


## Custom Plan

The home page now links to `custom-plan.html`, a separate monthly planner with separate browser storage. Growth and Survival calculations keep their existing behavior.

1. Choose your starting and end months using the calendar pickers, then enter assets, loans, default monthly SIP, and SIP destination. The duration is calculated automatically and includes both selected months. New investment accounts can start at zero.
2. In the monthly table, override any month's SIP (including zero to skip). A blank override uses the default SIP and annual step-up.
3. Choose a month and add extra investments to specific assets, loan prepayments, or one-time expenses. For example, leave the SIP at 20,000 and add a 50,000 bonus into a Stocks account.
4. Use **Save plan file** to download the complete editable plan as versioned JSON. **Import plan** validates the file and previews it before replacing the open Custom Plan. CSV downloads contain calculated schedules and cannot restore the plan.
5. **Copy Growth setup** previews a copy of saved Growth inputs, assets, loans, extras and enabled life expenses. It reads the existing data without changing it. Older manual-EMI loans need remaining tenure entered in Growth first. The copied SIP account uses an equivalent effective annual return to preserve Growth's nominal annual-rate / 12 calculation.

Monthly cash flows retain their calendar dates when the plan start or duration changes. Entries outside the projection are kept and excluded. Import does not advance balances or dates automatically. If you update a current balance later, also update the starting month to match that balance date. Edit forms must be applied/saved before exporting; unsaved form text is not part of the plan file.

Custom Plan supports 1–720 months, up to 50 assets, 50 loans and 2,000 dated cash flows. All asset returns are effective annual assumptions compounded monthly. End-of-month deposits start earning in the following month. Scheduled EMIs precede extra loan repayments and expenses. Prepayments keep EMI unchanged and shorten payoff; requests above outstanding debt are capped and the unused amount is not invested automatically. Income-funded payments assume external cash is available. Investment-funded payments use only withdrawable assets. Unfunded payments remain in loans; unfunded one-time costs do not create debt.

Current loans default to original amount and dates: enter the starting amount, annual interest, total tenure in years plus months, loan start date, and current balance date. Completed monthly anniversaries determine paid months; the first EMI is assumed one month after the start date, with month-end clamping. The form calculates remaining EMI count, monthly EMI, estimated outstanding principal, and total remaining payments including interest. These estimates assume all payments were made on time at a fixed rate. For past prepayments, missed payments, or rate changes, use the current outstanding balance method with lender-confirmed figures. Align the plan's starting month with the balance date. Saved loan dates and original details remain editable after import; existing balance-only loans remain supported. Run `node custom-loan.test.js` for date boundaries, independent amortisation, payoff, and saved-file checks.

For GitHub Pages, include the new production files `custom-plan.html`, `custom-plan.css`, `custom-engine.js`, and `custom-plan.js`, plus the updated `index.html` and `planner.css`, along with the existing calculator files. No build or server is required.

Run `node custom-plan.test.js` and `node custom-ui.test.js` for the custom calculation, JSON round-trip, file validation, date preservation, page handlers, CSV export, staged import, and read-only Growth-copy checks. The page handler tests cover data interactions, not visual browser layout.

The Growth header Reset button restores default inputs and INR, clears starting assets, loans, extras and Growth life expenses across currencies, resets forms and the schedule view, and saves the cleared state. Survival and Custom Plan data are unaffected.
