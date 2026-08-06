import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  UK_ASSUMPTIONS,
  allocationAtAccess,
  assessRetirementAt,
  incomeTax,
  project,
  requiredBridgeFund,
  retirementIncome,
} from '../finance-model.js';

const defaults = {
  age: 38,
  currentYear: 2026,
  sipp: 90_000,
  work: 60_000,
  isa: 0,
  monthly: 2_352,
  isaMonthly: 0,
  target: 40_000,
  rr: 0.04,
  swr: 0.04,
};

function closeTo(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test('projection starts with the actual current pot and advances one year once', () => {
  const { years } = project(defaults);

  assert.deepEqual(
    { age: years[0].age, year: years[0].year, total: years[0].total },
    { age: 38, year: 2026, total: 150_000 },
  );
  closeTo(years[1].sipp, 93_600);
  closeTo(years[1].work, 90_624);
  closeTo(years[1].total, 184_224);
});

test('calendar years derive from the entered age, not a hard-coded age 38', () => {
  const { years } = project({ ...defaults, age: 45, currentYear: 2030 });
  assert.equal(years[0].year, 2030);
  assert.equal(years.find(year => year.age === 50).year, 2035);
});

test('2026/27 income tax includes the Personal Allowance taper', () => {
  assert.equal(incomeTax(12_570), 0);
  closeTo(incomeTax(50_270), 7_540);
  closeTo(incomeTax(110_000), 33_432);
  closeTo(incomeTax(125_140), 42_516);
});

test('State Pension is current and sustainable income assumes tax-free cash is exhausted', () => {
  assert.equal(UK_ASSUMPTIONS.statePensionWeekly, 241.30);
  closeTo(UK_ASSUMPTIONS.statePensionAnnual, 12_547.60);

  const income = retirementIncome({
    age: 68,
    sipp: 500_000,
    work: 0,
    isa: 0,
    swr: 0.04,
  });

  closeTo(income.privateNet, 18_514);
  closeTo(income.totalNet, 28_552.08);
  assert.ok(
    income.totalNet < income.privateNet + UK_ASSUMPTIONS.statePensionAnnual,
    'State Pension must consume taxable allowance rather than be added net',
  );
});

test('near-term tax-free cash is explicitly bounded by remaining lifetime allowance', () => {
  const available = retirementIncome({
    age: 68,
    sipp: 500_000,
    work: 0,
    isa: 0,
    swr: 0.04,
    taxFreeCashRemaining: UK_ASSUMPTIONS.lumpSumAllowance,
  });
  const nearlyExhausted = retirementIncome({
    age: 68,
    sipp: 500_000,
    work: 0,
    isa: 0,
    swr: 0.04,
    taxFreeCashRemaining: 1_000,
  });

  closeTo(available.taxFreeCashUsed, 5_000);
  closeTo(available.totalNet, 29_552.08);
  closeTo(nearlyExhausted.taxFreeCashUsed, 1_000);
  assert.ok(nearlyExhausted.totalNet < available.totalNet);
});

test('pension wealth cannot create pre-57 FI without an ISA bridge', () => {
  const assessment = assessRetirementAt(
    { age: 55, sipp: 1_200_000, work: 0, isa: 0 },
    defaults,
  );

  closeTo(assessment.bridgeRequired, 40_000 + (40_000 / 1.04));
  assert.ok(assessment.bridgeGap > 78_000);
  assert.equal(assessment.ready, false);
});

test('a funded ISA bridge and sufficient age-57 income permit early FI', () => {
  const assessment = assessRetirementAt(
    { age: 55, sipp: 1_200_000, work: 0, isa: 80_000 },
    defaults,
  );

  assert.equal(assessment.bridgeYears, 2);
  assert.equal(assessment.bridgeGap, 0);
  assert.ok(assessment.accessIncome >= defaults.target);
  assert.equal(assessment.ready, true);
});

test('bridge funding uses real-return discounted withdrawals', () => {
  closeTo(requiredBridgeFund(40_000, 2, 0.04), 78_461.5384615);
  closeTo(requiredBridgeFund(40_000, 2, 0), 80_000);
});

test('extra SIPP contributions land in SIPP, not workplace pension', () => {
  const baseline = project(defaults).years[1];
  const changed = project(defaults, 500).years[1];

  closeTo(changed.sipp - baseline.sipp, 6_000);
  closeTo(changed.work, baseline.work);
});

test('allocator reports age 57 and preserves combined wealth under equal assumptions', () => {
  const currentPlan = allocationAtAccess(defaults, 2_352, 0);
  const redirected = allocationAtAccess(defaults, 2_352, 500);

  assert.equal(currentPlan.age, 57);
  assert.equal(redirected.age, 57);
  closeTo(currentPlan.total, redirected.total);
  assert.ok(redirected.sipp > currentPlan.sipp);
  assert.ok(currentPlan.sipp < 200_000, 'must not accidentally return the age-75 balance');
});

test('the page exposes the tested model without fragile inline handlers', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /from '\.\/finance-model\.js'/);
  assert.match(html, /from '\.\/state-model\.js'/);
  assert.match(html, /ISA Bridge Test/);
  assert.match(html, /Accessible FI age/);
  assert.match(html, /Reset example plan/);
  assert.match(html, /fi-tracker-plan-v1/);
  assert.match(html, /£12,547\.60\/yr full 2026\/27 rate/);
  assert.doesNotMatch(html, /£11,502/);
  assert.doesNotMatch(html, /\son(?:click|input)=/);
  assert.doesNotMatch(html, /Potion Breakdown/);
});
