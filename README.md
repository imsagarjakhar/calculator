# Growth & Survival Calculator

Open `index.html` in a browser. No build or external dependencies are required.

- **Check Growth:** the existing SIP, annual step-up, extra investment, and goal planner.
- **Check Survival:** current corpus, age, monthly SWP, inflation, effective annual return, and end age, with estimated funded days, depletion age, a chart, yearly balances, and CSV download.

Survival spreads each month's SWP budget across its plan-month days, compounds the effective annual return daily, and increases the budget on each plan anniversary. It includes leap days and partial final-day coverage. It is a forward projection with fixed assumptions, not a historical backtest. Detailed assumptions are available below the calculator.

Inputs are stored locally when browser storage is available. Growth and Survival keep separate inputs. Currency amounts in Survival are entered directly without conversion.

Both calculators support optional life expenses: child education, weddings, home/car purchases, medical costs, renovations, travel, emergencies, and custom events. Set a plan year/month and enter either today's cost (inflated to the event month) or the future cost. Edit, pause/include, or remove entries to compare scenarios. Growth and Survival save separate expense lists for each currency; resetting the example inputs keeps these lists.

Growth pays life expenses after each month's SIP and extra deposits; today's costs are inflated through that month-end. Unfunded costs are reported without creating debt; later SIP contributions continue. Survival pays expenses at the start of their plan month and stops at corpus depletion. Its unfunded summary includes later scheduled costs. The summaries compare each plan with the same assumptions and no life expenses. Yearly/monthly tables and CSV exports include funded expenses and shortfalls.

Run calculation checks with `node survival-engine.test.js`, `node life-events.test.js`, and `node calculation-audit.test.js`. The audit compares 100 Growth scenarios with independent future-value sums and 60 Survival scenarios with monthly geometric-sum formulas, and checks both calculators’ generated tables and CSV values. Survival uses months anchored to the start date (with month-end clamping) so each full year funds exactly twelve inflation-adjusted monthly budgets.
