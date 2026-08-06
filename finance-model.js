export const UK_ASSUMPTIONS = Object.freeze({
  taxYear: '2026/27',
  statePensionWeekly: 241.30,
  statePensionAnnual: 241.30 * 52,
  statePensionAge: 68,
  pensionAccessAge: 57,
  personalAllowance: 12_570,
  personalAllowanceTaperStart: 100_000,
  basicRateLimit: 37_700,
  additionalRateThreshold: 125_140,
  basicRate: 0.20,
  higherRate: 0.40,
  additionalRate: 0.45,
  pensionTaxFreeFraction: 0.25,
  lumpSumAllowance: 268_275,
});

export const RESILIENCE_ASSUMPTIONS = Object.freeze({
  realReturnDelta: 0.02,
  cautiousWithdrawalRate: 0.035,
});

function nonNegative(value) {
  return Math.max(0, Number(value) || 0);
}

export function incomeTax(grossTaxableIncome) {
  const gross = nonNegative(grossTaxableIncome);
  const allowanceReduction = Math.max(
    0,
    (gross - UK_ASSUMPTIONS.personalAllowanceTaperStart) / 2,
  );
  const allowance = Math.max(
    0,
    UK_ASSUMPTIONS.personalAllowance - allowanceReduction,
  );
  const taxable = Math.max(0, gross - allowance);
  const basicSlice = Math.min(taxable, UK_ASSUMPTIONS.basicRateLimit);
  const higherSlice = Math.min(
    Math.max(0, taxable - UK_ASSUMPTIONS.basicRateLimit),
    UK_ASSUMPTIONS.additionalRateThreshold - UK_ASSUMPTIONS.basicRateLimit,
  );
  const additionalSlice = Math.max(
    0,
    taxable - UK_ASSUMPTIONS.additionalRateThreshold,
  );

  return (
    basicSlice * UK_ASSUMPTIONS.basicRate
    + higherSlice * UK_ASSUMPTIONS.higherRate
    + additionalSlice * UK_ASSUMPTIONS.additionalRate
  );
}

export function retirementIncome({
  age,
  sipp,
  work,
  isa,
  swr,
  taxFreeCashRemaining = 0,
}) {
  const pensionAccessible = age >= UK_ASSUMPTIONS.pensionAccessAge;
  const pensionGross = pensionAccessible
    ? (nonNegative(sipp) + nonNegative(work)) * nonNegative(swr)
    : 0;
  const isaGross = nonNegative(isa) * nonNegative(swr);
  const taxFreeCashUsed = Math.min(
    pensionGross * UK_ASSUMPTIONS.pensionTaxFreeFraction,
    nonNegative(taxFreeCashRemaining),
    UK_ASSUMPTIONS.lumpSumAllowance,
  );
  const pensionTaxable = pensionGross - taxFreeCashUsed;
  const privateNet = pensionGross + isaGross - incomeTax(pensionTaxable);
  const state = age >= UK_ASSUMPTIONS.statePensionAge
    ? UK_ASSUMPTIONS.statePensionAnnual
    : 0;
  const totalNet = pensionGross + isaGross + state - incomeTax(pensionTaxable + state);

  return {
    pensionGross,
    isaGross,
    taxFreeCashUsed,
    grossSWR: pensionGross + isaGross,
    privateNet,
    state,
    totalNet,
  };
}

export function requiredBridgeFund(annualTarget, years, realReturn) {
  const target = nonNegative(annualTarget);
  const count = Math.max(0, Math.floor(Number(years) || 0));
  const rate = Number(realReturn) || 0;
  let required = 0;

  for (let year = 0; year < count; year += 1) {
    required += target / ((1 + rate) ** year);
  }

  return required;
}

export function assessRetirementAt({ age, sipp, work, isa }, inputs) {
  const target = nonNegative(inputs.target);
  const swr = nonNegative(inputs.swr);
  const rr = Number(inputs.rr) || 0;

  if (age >= UK_ASSUMPTIONS.pensionAccessAge) {
    const income = retirementIncome({ age, sipp, work, isa, swr });
    return {
      ready: income.totalNet >= target,
      bridgeYears: 0,
      bridgeRequired: 0,
      bridgeGap: 0,
      accessIncome: income.totalNet,
      postAccessGap: Math.max(0, target - income.totalNet),
    };
  }

  const bridgeYears = UK_ASSUMPTIONS.pensionAccessAge - age;
  const bridgeRequired = requiredBridgeFund(target, bridgeYears, rr);
  const bridgeGap = Math.max(0, bridgeRequired - nonNegative(isa));
  let futureSipp = nonNegative(sipp);
  let futureWork = nonNegative(work);
  let remainingIsa = nonNegative(isa);

  for (let year = 0; year < bridgeYears; year += 1) {
    remainingIsa = Math.max(0, remainingIsa - target) * (1 + rr);
    futureSipp *= 1 + rr;
    futureWork *= 1 + rr;
  }

  const accessIncome = retirementIncome({
    age: UK_ASSUMPTIONS.pensionAccessAge,
    sipp: futureSipp,
    work: futureWork,
    isa: remainingIsa,
    swr,
  }).totalNet;
  const postAccessGap = Math.max(0, target - accessIncome);

  return {
    ready: bridgeGap <= 0.01 && postAccessGap <= 0.01,
    bridgeYears,
    bridgeRequired,
    bridgeGap,
    accessIncome,
    postAccessGap,
  };
}

export function project(
  inputs,
  extraSippMonthly = 0,
  extraIsaMonthly = 0,
  extraWorkMonthly = 0,
) {
  const age = Math.max(18, Math.floor(Number(inputs.age) || 18));
  const currentYear = Math.floor(Number(inputs.currentYear) || new Date().getFullYear());
  const rr = Number(inputs.rr) || 0;
  const annualWork = (
    nonNegative(inputs.monthly) + nonNegative(extraWorkMonthly)
  ) * 12;
  const annualSipp = nonNegative(extraSippMonthly) * 12;
  const annualIsa = (nonNegative(inputs.isaMonthly) + nonNegative(extraIsaMonthly)) * 12;
  let sipp = nonNegative(inputs.sipp);
  let work = nonNegative(inputs.work);
  let isa = nonNegative(inputs.isa);
  let fiAge = null;
  const years = [];

  for (let projectedAge = age; projectedAge <= 75; projectedAge += 1) {
    const income = retirementIncome({
      age: projectedAge,
      sipp,
      work,
      isa,
      swr: inputs.swr,
    });
    const retirement = assessRetirementAt(
      { age: projectedAge, sipp, work, isa },
      inputs,
    );
    const total = sipp + work + isa;

    if (fiAge === null && retirement.ready) fiAge = projectedAge;

    years.push({
      age: projectedAge,
      year: currentYear + (projectedAge - age),
      sipp,
      work,
      isa,
      total,
      ...income,
      retirement,
      fi: retirement.ready,
    });

    sipp = sipp * (1 + rr) + annualSipp;
    work = work * (1 + rr) + annualWork;
    isa = isa * (1 + rr) + annualIsa;
  }

  return { years, fiAge };
}

export function planResilience(inputs) {
  const selectedReturn = Number(inputs.rr) || 0;
  const selectedWithdrawal = nonNegative(inputs.swr);
  const scenarios = [
    {
      key: 'cautious',
      label: 'Cautious',
      rr: Math.max(0, selectedReturn - RESILIENCE_ASSUMPTIONS.realReturnDelta),
      swr: Math.min(
        selectedWithdrawal,
        RESILIENCE_ASSUMPTIONS.cautiousWithdrawalRate,
      ),
    },
    {
      key: 'selected',
      label: 'Your plan',
      rr: selectedReturn,
      swr: selectedWithdrawal,
    },
    {
      key: 'favourable',
      label: 'Favourable',
      rr: selectedReturn + RESILIENCE_ASSUMPTIONS.realReturnDelta,
      swr: selectedWithdrawal,
    },
  ];

  return scenarios.map(scenario => ({
    ...scenario,
    fiAge: project({
      ...inputs,
      rr: scenario.rr,
      swr: scenario.swr,
    }).fiAge,
  }));
}

export function allocationAtAccess(inputs, totalMonthly, redirectMonthly) {
  const rr = Number(inputs.rr) || 0;
  const total = nonNegative(totalMonthly);
  const redirect = Math.min(total, nonNegative(redirectMonthly));
  const workMonthly = total - redirect;
  let age = Math.max(18, Math.floor(Number(inputs.age) || 18));
  let sipp = nonNegative(inputs.sipp);
  let work = nonNegative(inputs.work);

  while (age < UK_ASSUMPTIONS.pensionAccessAge) {
    sipp = sipp * (1 + rr) + redirect * 12;
    work = work * (1 + rr) + workMonthly * 12;
    age += 1;
  }

  return {
    age,
    sipp,
    work,
    total: sipp + work,
    redirect,
    workMonthly,
  };
}
