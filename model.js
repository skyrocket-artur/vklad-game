/* Налог на вклад · расчётная модель (без DOM, проверяется тестами) */
(function (root) {
  'use strict';

  // Необлагаемый лимит = 1 млн ₽ × максимальная ключевая ставка ЦБ на 1-е число месяцев года
  const YEARS = {
    2025: { keyMax: 21, limit: 210000, due: '1 декабря 2026', note: 'Максимальная ключевая в 2025 году — 21%.' },
    2026: { keyMax: 16, limit: 160000, due: '1 декабря 2027', note: 'Прогноз: максимум ключевой в 2026 — 16% (на 1 января). Если до 1 декабря ставку не поднимут выше, лимит останется 160 000 ₽.' }
  };

  // Инвестиционные доходы (проценты по вкладам, купоны, дивиденды, продажа бумаг): 13% до 2,4 млн, 15% сверху
  const INV_STEP = 2400000;
  function invTax(base) {
    base = Math.max(0, base);
    return base <= INV_STEP ? base * 0.13 : INV_STEP * 0.13 + (base - INV_STEP) * 0.15;
  }

  // Прогрессивная шкала НДФЛ для зарплаты и других «основных» доходов (с 2025 года)
  const SALARY_SCALE = [
    { upTo: 2400000, rate: 13 },
    { upTo: 5000000, rate: 15 },
    { upTo: 20000000, rate: 18 },
    { upTo: 50000000, rate: 20 },
    { upTo: Infinity, rate: 22 }
  ];
  function salaryMarginalRate(yearIncome) {
    for (const s of SALARY_SCALE) if (yearIncome <= s.upTo) return s.rate;
    return 22;
  }

  function interest(sum, ratePct, months, capitalize) {
    const r = ratePct / 100;
    if (capitalize) return sum * (Math.pow(1 + r / 12, months) - 1);
    return sum * r * months / 12;
  }

  function depositTax(o) {
    const y = YEARS[o.year] || YEARS[2026];
    const inc = interest(o.sum, o.rate, o.months, o.capitalize);
    const taxable = Math.max(0, inc - y.limit);
    const other = Math.max(0, o.otherInv || 0);
    const tax = invTax(other + taxable) - invTax(other);
    const at15 = Math.max(0, other + taxable - Math.max(INV_STEP, other));
    // с какой суммы на вкладе (на 12 мес, без капитализации) появляется налог
    const breakEven = o.rate > 0 ? y.limit / (o.rate / 100) : Infinity;
    return { income: inc, limit: y.limit, taxable, tax, at15, breakEven, due: y.due, note: y.note,
             effective: inc > 0 ? tax / inc : 0 };
  }

  function realYield(o, inflPct) {
    const t = depositTax(o);
    const years = o.months / 12;
    const net = t.income - t.tax;
    const nominal = o.sum > 0 ? t.income / o.sum / years : 0;
    const afterTax = o.sum > 0 ? net / o.sum / years : 0;
    const real = (1 + afterTax) / (1 + inflPct / 100) - 1;
    const inflLoss = o.sum * (Math.pow(1 + inflPct / 100, years) - 1);
    return { nominal, afterTax, real, net, inflLoss, realRub: net - inflLoss };
  }

  const ASV_LIMIT = 1400000;
  function insurance(sum) {
    const banks = Math.max(1, Math.ceil(sum / ASV_LIMIT));
    return { banks, uninsured: Math.max(0, sum - ASV_LIMIT), limit: ASV_LIMIT };
  }

  // ИИС-3, вычет типа А: до 400 000 ₽ взносов в год, вернётся НДФЛ по твоей ставке
  const IIS_MAX = 400000;
  function iis(contrib, salaryYear) {
    const base = Math.min(Math.max(0, contrib), IIS_MAX);
    const rate = salaryMarginalRate(salaryYear);
    const paidNdfl = salaryYearTax(salaryYear);
    const refund = Math.min(base * rate / 100, paidNdfl);
    return { base, rate, refund };
  }
  function salaryYearTax(income) {
    let tax = 0, prev = 0;
    for (const s of SALARY_SCALE) {
      const part = Math.min(income, s.upTo) - prev;
      if (part > 0) tax += part * s.rate / 100;
      prev = s.upTo;
      if (income <= s.upTo) break;
    }
    return tax;
  }

  const api = { YEARS, INV_STEP, invTax, SALARY_SCALE, salaryMarginalRate, salaryYearTax,
                interest, depositTax, realYield, insurance, iis, ASV_LIMIT, IIS_MAX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M = api;
})(this);
