# Growth & Survival Calculator

Open `index.html` in a browser. No build or external dependencies are required.

- **Check Growth:** starting assets, loans, SIP, annual step-up, extra investments, life expenses, and a net wealth goal.
- **Check Survival:** current corpus, age, monthly SWP, inflation, effective annual return, and end age, with estimated funded days, depletion age, a chart, yearly balances, and CSV download.

Survival spreads each month's SWP budget across its plan-month days, compounds the effective annual return daily, and increases the budget on each plan anniversary. It includes leap days and partial final-day coverage. It is a forward projection with fixed assumptions, not a historical backtest. Detailed assumptions are available below the calculator.

Inputs are stored locally when browser storage is available. Growth and Survival keep separate inputs. Currency amounts in Survival are entered directly without conversion.

Both calculators support optional life expenses: child education, weddings, home/car purchases, medical costs, renovations, travel, emergencies, and custom events. Set a plan year/month and enter either today's cost (inflated to the event month) or the future cost. Edit, pause/include, or remove entries to compare scenarios. Growth and Survival save separate expense lists for each currency; resetting the example inputs keeps these lists.

Growth pays life expenses after each month's SIP, extra deposits, and EMIs; today's costs are inflated through that month-end. Unfunded costs are reported without creating debt; later SIP contributions continue. Survival pays expenses at the start of their plan month and stops at corpus depletion. Its unfunded summary includes later scheduled costs. The summaries compare each plan with the same assumptions and no life expenses. Yearly/monthly tables and CSV exports include funded expenses and shortfalls.

Run calculation checks with `node survival-engine.test.js`, `node life-events.test.js`, and `node calculation-audit.test.js`. The audit compares 100 Growth scenarios with independent future-value sums and 60 Survival scenarios with monthly geometric-sum formulas, and checks both calculators’ generated tables and CSV values. Survival uses months anchored to the start date (with month-end clamping) so each full year funds exactly twelve inflation-adjusted monthly budgets.

Growth also supports multiple existing assets (each with its own effective annual return / CAGR and withdrawal availability) and loans (outstanding principal, nominal annual interest, EMI, payment source). Net wealth equals all projected assets minus remaining loans; available funds exclude assets marked not for withdrawal. Income-funded EMIs do not reduce the investment pool: enter the SIP after EMI commitments. Investment-funded EMIs draw from the SIP pool, then withdrawable assets in listed order, before life expenses. Underfunded EMIs remain in the debt balance, which continues accruing interest. Payments stop after payoff and the final EMI is capped at debt due; SIPs stay unchanged after payoff. Rates are fixed and fees or penalties are not modelled. Example resets preserve assets and loans; each currency has its own saved list.

Run `node growth-position.test.js` for asset compounding/depreciation, independent loan amortisation, payoff, negative amortisation, both EMI sources, unavailable assets, reconciliation, goals, and table/CSV checks.

For GitHub Pages, deploy `index.html`, `planner.css`, `life-events.js`, `growth-engine.js`, `growth-holdings.js`, `survival-engine.js`, and `survival.js` together. No build step is needed.
