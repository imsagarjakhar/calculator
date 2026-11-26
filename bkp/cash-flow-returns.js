(function (root) {
  "use strict";
  function cashFlowRates(cash, times, low = -30, high = 30) {
    // In log-rate space, NPV is a sum of exponentials. Split at its
    // turning points so closely spaced returns and tangent roots are visible.
    function roots(amounts, dates) {
      const changes = amounts.flatMap((amount, i) =>
        i && Math.sign(amount) !== Math.sign(amounts[i - 1]) ? [i] : [],
      );
      if (!changes.length) return [];

      function npv(rate) {
        const pivot = rate < 0 ? dates[dates.length - 1] : dates[0];
        let sum = 0,
          scale = 0;
        for (let i = 0; i < amounts.length; i++) {
          const term = amounts[i] * Math.exp(-(dates[i] - pivot) * rate);
          sum += term;
          scale += Math.abs(term);
        }
        return sum / scale;
      }
      let turns = [];
      if (changes.length > 1) {
        // Factoring out the exponential at a sign change preserves roots.
        // The derivative then has fewer sign changes than the original.
        const pivot = changes[Math.floor(changes.length / 2)];
        const derivative = amounts.map((a, i) => a * (dates[pivot] - dates[i]));
        const magnitude = derivative.reduce(
          (m, a) => Math.max(m, Math.abs(a)),
          0,
        );
        turns = roots(
          derivative.filter((_, i) => i !== pivot).map((a) => a / magnitude),
          dates.filter((_, i) => i !== pivot),
        );
      }
      const points = [low, ...turns, high];
      const values = points.map(npv);
      const zero = (v) => Math.abs(v) <= 8 * Number.EPSILON;
      const found = points.filter((_, i) => zero(values[i]));
      for (let i = 1; i < points.length; i++) {
        if (
          zero(values[i - 1]) ||
          zero(values[i]) ||
          Math.sign(values[i - 1]) === Math.sign(values[i])
        )
          continue;
        let left = points[i - 1],
          right = points[i];
        for (let j = 0; j < 100; j++) {
          const mid = (left + right) / 2,
            value = npv(mid);
          if (value === 0) {
            left = right = mid;
            break;
          }
          if (Math.sign(value) === Math.sign(values[i - 1])) left = mid;
          else right = mid;
        }
        found.push((left + right) / 2);
      }
      return found.sort((a, b) => a - b);
    }
    return roots(
      cash.filter((a) => a !== 0),
      times.filter((_, i) => cash[i] !== 0),
    );
  }
  if (typeof module !== "undefined" && module.exports)
    module.exports = cashFlowRates;
  else root.CashFlowRates = cashFlowRates;
})(globalThis);
