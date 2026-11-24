import { field, tool, type Field } from "./model.ts";

const day = 86400000;
const local = new Date();
const today = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate());
const format = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "long",
  timeZone: "UTC",
});
const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const date = (label: string, value: number): Field => ({
  label,
  value,
  type: "date",
});
const integer = (label: string, value: number, min: number, max: number) => ({
  ...field(label, value, min, max),
  step: 1,
});
const choice = (label: string, options: string[], value = 0) => ({
  label,
  options,
  value,
});
const start = date("Start date", today);
const end = date("End date", today + 30 * day);
const birth = date("Date of birth", Date.UTC(1990, 0, 1));
const asOf = date("As of date", today);
const weekendField = choice("Weekend policy", [
  "Saturday and Sunday",
  "Sunday and second/fourth Saturdays",
  "Sunday only",
  "Friday and Saturday",
  "No weekly closures",
]);
const holidayField = choice("Holiday calendar", [
  "No public holidays",
  "2026 gazetted holidays · Delhi central government offices",
]);
const customDate = date("Additional closed date", today);
const listedHolidays = new Set(
  "01-26 03-04 03-21 03-26 03-31 04-03 05-01 05-27 06-26 08-15 08-26 09-04 10-02 10-20 11-08 11-24 12-25"
    .split(" ")
    .map((s) => Date.parse("2026-" + s + "T00:00:00Z")),
);
const holidaySource = "https://www.cgca.gov.in/ccadl/list-of-holiday";

// setUTCFullYear also handles years 1 through 99, which Date.UTC offsets by 1900.
function calendarDate(year: number, month: number, dom: number) {
  const d = new Date(0);
  d.setUTCFullYear(year, month, dom);
  return d.getTime();
}
function shiftMonths(time: number, months: number) {
  const d = new Date(time);
  const y = d.getUTCFullYear(),
    m = d.getUTCMonth() + months;
  const last = new Date(calendarDate(y, m + 1, 0)).getUTCDate();
  return calendarDate(y, m, Math.min(d.getUTCDate(), last));
}
function components(from: number, to: number) {
  if (to < from)
    throw Error("The end date must be on or after the start date.");
  const a = new Date(from),
    b = new Date(to);
  let months =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    b.getUTCMonth() -
    a.getUTCMonth();
  if (shiftMonths(from, months) > to) months--;
  const days = (to - shiftMonths(from, months)) / day;
  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days,
    totalMonths: months,
  };
}
function duration(from: number, to: number) {
  const { years, months, days } = components(from, to);
  return years + " years, " + months + " months, " + days + " days";
}
function weekend(time: number, policy: number) {
  const d = new Date(time),
    weekday = d.getUTCDay(),
    week = Math.ceil(d.getUTCDate() / 7);
  if (policy === 4) return false;
  if (policy === 3) return weekday === 5 || weekday === 6;
  return (
    weekday === 0 ||
    (weekday === 6 &&
      (policy === 0 || (policy === 1 && (week === 2 || week === 4))))
  );
}
function holidaySet(preset: number, extra: number[]) {
  return new Set([...(preset === 1 ? listedHolidays : []), ...extra]);
}
function closed(time: number, policy: number, holidays: Set<number>) {
  return weekend(time, policy) || holidays.has(time);
}
function nextWorking(time: number, policy: number, holidays: Set<number>) {
  let next = time;
  while (closed(next, policy, holidays)) next += day;
  return next;
}
function weekNumber(time: number) {
  const d = new Date(time);
  const thursday = time + (4 - (d.getUTCDay() || 7)) * day;
  const y = new Date(thursday).getUTCFullYear();
  return (
    y +
    "-W" +
    String(
      Math.floor((thursday - calendarDate(y, 0, 1)) / (7 * day)) + 1,
    ).padStart(2, "0")
  );
}
function showDate(time: number) {
  const d = new Date(time);
  if (
    !Number.isFinite(time) ||
    d.getUTCFullYear() < 1 ||
    d.getUTCFullYear() > 9999
  )
    throw Error("Choose dates and a duration within years 1–9999.");
  return format.format(time);
}

export const ageCalculator = tool(
  "age",
  "Age calculator",
  "Find exact calendar age, milestones and the next birthday. A 29 February birthday uses 28 February in shorter years.",
  [birth, asOf],
  ([dob, asof]) => {
    const age = components(dob, asof);
    const total = (asof - dob) / day;
    const next = shiftMonths(dob, (age.years + 1) * 12);
    const aug = calendarDate(new Date(asof).getUTCFullYear(), 7, 1);
    const fiscal = (time: number) => {
      const d = new Date(time);
      const y = d.getUTCFullYear() - Number(d.getUTCMonth() < 3);
      return y + "–" + (y + 1);
    };
    return {
      "Calendar age": duration(dob, asof),
      "Completed years": age.years,
      "Total months completed": age.totalMonths,
      "Total weeks completed": Math.floor(total / 7),
      "Total days": total,
      "Total hours": total * 24,
      "Next birthday": showDate(next),
      "Days to next birthday": (next - asof) / day,
      "18th birthday": showDate(shiftMonths(dob, 18 * 12)),
      "21st birthday": showDate(shiftMonths(dob, 21 * 12)),
      "Age on 1 August of selected year":
        aug < dob ? "Before birth" : duration(dob, aug),
      "60th birthday": showDate(shiftMonths(dob, 60 * 12)),
      "Indian financial year of 60th birthday": fiscal(
        shiftMonths(dob, 60 * 12),
      ),
      "80th birthday": showDate(shiftMonths(dob, 80 * 12)),
      "Indian financial year of 80th birthday": fiscal(
        shiftMonths(dob, 80 * 12),
      ),
    };
  },
);
const offsetFields = [
  start,
  choice("Direction", ["After", "Before"]),
  integer("Years", 0, 0, 9999),
  integer("Months", 1, 0, 12000),
  integer("Weeks", 0, 0, 52000),
  integer("Days", 0, 0, 100000),
];
function offset([from, back, years, months, weeks, days]: number[]) {
  const sign = back ? -1 : 1;
  return (
    shiftMonths(from, sign * (years * 12 + months)) +
    sign * (weeks * 7 + days) * day
  );
}
function offsetResult(values: number[]) {
  const result = offset(values);
  return {
    "Resulting date": showDate(result),
    Weekday: weekdays[new Date(result).getUTCDay()],
    "ISO week": weekNumber(result),
    "Calendar days from start": (result - values[0]) / day,
  };
}
function deadlineResult(values: number[]) {
  const result = offset(values),
    policy = values[6],
    holidays = holidaySet(values[7], values.slice(8));
  return {
    ...offsetResult(values),
    "Working day": closed(result, policy, holidays) ? "No" : "Yes",
    "Effective working date": showDate(nextWorking(result, policy, holidays)),
  };
}
const holidaysRepeat = { size: 1, label: "holiday" };
const workingFields = [
  start,
  choice("Direction", ["After", "Before"]),
  integer("Working days", 10, 0, 100000),
  weekendField,
  holidayField,
];
function workingOffset([
  from,
  back,
  count,
  policy,
  preset,
  ...custom
]: number[]) {
  const holidays = holidaySet(preset, custom);
  let result = from;
  for (let i = 0; i < count; ) {
    result += (back ? -1 : 1) * day;
    if (!closed(result, policy, holidays)) i++;
  }
  return {
    "Resulting working-day offset": showDate(result),
    Weekday: weekdays[new Date(result).getUTCDay()],
    "Elapsed calendar days": Math.abs(result - from) / day,
  };
}
export const dateOffset = {
  ...tool(
    "date-offset",
    "Date before or after",
    "Add or subtract years and months together, clamping to the last valid day, then apply weeks and days. Working-day offsets start counting on the following or preceding date.",
    offsetFields,
    offsetResult,
    holidaySource,
  ),
  modes: [
    {
      title: "Check a deadline against working days",
      fields: [...offsetFields, weekendField, holidayField],
      calculate: deadlineResult,
    },
    {
      title: "Check a deadline with additional holidays",
      fields: [...offsetFields, weekendField, holidayField, customDate],
      repeatFields: holidaysRepeat,
      calculate: deadlineResult,
    },
    {
      title: "Add or subtract working days",
      fields: workingFields,
      calculate: workingOffset,
    },
    {
      title: "Working-day offset with additional holidays",
      fields: [...workingFields, customDate],
      repeatFields: holidaysRepeat,
      calculate: workingOffset,
    },
  ],
};
const inclusive = choice("Counting convention", [
  "Exclude start, include end",
  "Include both dates",
]);
function between([from, to, include]: number[]) {
  if (to < from) throw Error("Choose an end date on or after the start date.");
  const n = (to - from) / day + include;
  return {
    "Days counted": n,
    "Calendar span": duration(from, to + include * day),
    "Completed weeks": Math.floor(n / 7),
    "Days after complete weeks": n % 7,
  };
}
function countWeekday(start: number, end: number, w: number) {
  const first = start + ((w - new Date(start).getUTCDay() + 7) % 7) * day;
  return first > end ? 0 : 1 + Math.floor((end - first) / (7 * day));
}
function workBetween([from, to, include, policy, preset, ...custom]: number[]) {
  if (to < from) throw Error("Choose an end date on or after the start date.");
  const first = from + (include ? 0 : day),
    n = (to - first) / day + 1;
  const daysOff =
    policy === 0 ? [0, 6] : policy === 3 ? [5, 6] : policy === 4 ? [] : [0];
  let weekends = daysOff.reduce(
    (sum, w) => sum + countWeekday(first, to, w),
    0,
  );
  if (policy === 1 && first <= to) {
    const d = new Date(first);
    let month = calendarDate(d.getUTCFullYear(), d.getUTCMonth(), 1);
    while (month <= to) {
      const sat = month + ((6 - new Date(month).getUTCDay() + 7) % 7) * day;
      for (const off of [sat + 7 * day, sat + 21 * day])
        if (first <= off && off <= to) weekends++;
      month = shiftMonths(month, 1);
    }
  }
  const holidays = [...holidaySet(preset, custom)].filter(
    (h) => h >= first && h <= to && !weekend(h, policy),
  ).length;
  return {
    "Working days": n - weekends - holidays,
    "Calendar days counted": n,
    "Weekly closure days": weekends,
    "Additional holiday closures": holidays,
  };
}
const businessFields = [start, end, inclusive, weekendField, holidayField];
export const daysBetween = {
  ...tool(
    "days-between",
    "Days between dates",
    "Count a calendar span, count working days, or calculate a tenure end date. Holiday and weekend closures on the same date count once.",
    [start, end, inclusive],
    between,
    holidaySource,
  ),
  modes: [
    { title: "Business days", fields: businessFields, calculate: workBetween },
    {
      title: "Business days with additional holidays",
      fields: [...businessFields, customDate],
      repeatFields: holidaysRepeat,
      calculate: workBetween,
    },
    { title: "Tenure end date", fields: offsetFields, calculate: offsetResult },
  ],
};
const retirementFields = [
  integer("Current age (years)", 35, 0, 120),
  integer("Plan through age (years)", 90, 1, 125),
  field("Current monthly living expenses (₹)", 40000, 0),
  field("Current monthly healthcare costs (₹)", 5000, 0),
  field("Current retirement savings (₹)", 1000000, 0),
  field("Monthly investment until retirement (₹)", 20000, 0),
  field("Annual living-cost inflation (%)", 5, 0, 50),
  field("Annual healthcare inflation (%)", 8, 0, 50),
  field("Annual return before retirement (%)", 8, -50, 50),
  field("Annual return after retirement (%)", 6, -50, 50),
];
function retirementProjection(values: number[]) {
  const [
    current,
    last,
    living,
    health,
    savings,
    sip,
    inf,
    medical,
    pre,
    post,
    target,
  ] = values;
  if (
    last <= current ||
    (target !== undefined && (target < current || target >= last))
  )
    throw Error(
      "Use a retirement age from your current age to before the planning horizon.",
    );
  const monthlyRate = Math.expm1(Math.log1p(pre / 100) / 12);
  function estimate(age: number) {
    const wait = age - current,
      months = wait * 12;
    const factor =
      monthlyRate === 0
        ? months
        : Math.expm1(months * Math.log1p(monthlyRate)) / monthlyRate;
    const available = savings * (1 + pre / 100) ** wait + sip * factor;
    const livingAtRetirement = living * (1 + inf / 100) ** wait;
    const healthAtRetirement = health * (1 + medical / 100) ** wait;
    function required(monthly: number, inflation: number) {
      const ratio = (1 + inflation / 100) / (1 + post / 100);
      const term = last - age;
      const sum =
        ratio === 1 ? term : Math.expm1(term * Math.log(ratio)) / (ratio - 1);
      return monthly * 12 * sum;
    }
    const need =
      required(livingAtRetirement, inf) + required(healthAtRetirement, medical);
    return {
      "Age at retirement": age,
      "Required corpus (₹)": need,
      "Projected savings (₹)": available,
      "Surplus or shortfall (₹)": available - need,
      "First retirement year living costs (₹)": livingAtRetirement * 12,
      "First retirement year healthcare costs (₹)": healthAtRetirement * 12,
    };
  }
  if (target !== undefined) return estimate(target);
  for (let age = current; age < last; age++) {
    const result = estimate(age);
    if (result["Surplus or shortfall (₹)"] >= 0) return result;
  }
  return {
    Projection:
      "Savings do not cover a full retirement year before the selected horizon.",
    "Shortfall at final candidate age (₹)": -estimate(last - 1)[
      "Surplus or shortfall (₹)"
    ],
  };
}
export const retirementAge = {
  ...tool(
    "retirement-age",
    "Retirement age",
    "Find your retirement birthday or estimate when your savings can fund retirement. Projections assume monthly deposits at month end, an annual expense withdrawal at the start of each retirement year and separate inflation rates for living and healthcare.",
    [birth, integer("Retirement age (years)", 60, 1, 120), asOf],
    ([dob, age, asof]) => {
      if (asof < dob)
        throw Error("The reference date must be on or after birth.");
      const target = shiftMonths(dob, age * 12),
        difference = target - asof;
      return {
        "Retirement date": showDate(target),
        "Current age": duration(dob, asof),
        [difference >= 0 ? "Time until retirement" : "Time since retirement"]:
          duration(Math.min(target, asof), Math.max(target, asof)),
        "Days from reference date": difference / day,
      };
    },
  ),
  modes: [
    {
      title: "Earliest affordable retirement age",
      fields: retirementFields,
      calculate: retirementProjection,
    },
    {
      title: "Corpus for a target retirement age",
      fields: [
        ...retirementFields,
        integer("Target retirement age", 60, 1, 120),
      ],
      calculate: retirementProjection,
    },
  ],
};
