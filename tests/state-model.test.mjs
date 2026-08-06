import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_PLAN,
  PLAN_FIELDS,
  normalisePlan,
  normaliseSnapshots,
} from '../state-model.js';

test('the saved plan contract covers every editable control exactly once', () => {
  assert.equal(PLAN_FIELDS.length, 14);
  assert.equal(new Set(PLAN_FIELDS).size, PLAN_FIELDS.length);
  assert.deepEqual(Object.keys(DEFAULT_PLAN), PLAN_FIELDS);
});

test('malformed plan fields recover to safe bounded values', () => {
  const plan = normalisePlan({
    age: 45.9,
    sipp: [],
    work: -50,
    monthly: null,
    target: 1,
    returnRate: 99,
    swr: 'not-a-rate',
    salaryIncrease: 25,
  });

  assert.equal(plan.age, 45);
  assert.equal(plan.sipp, DEFAULT_PLAN.sipp);
  assert.equal(plan.work, 0);
  assert.equal(plan.monthly, DEFAULT_PLAN.monthly);
  assert.equal(plan.target, 10_000);
  assert.equal(plan.returnRate, 8);
  assert.equal(plan.swr, DEFAULT_PLAN.swr);
  assert.equal(plan.salaryIncrease, 20);
  assert.equal(Object.keys(plan).length, PLAN_FIELDS.length);
});

test('cleared zero-allowed controls persist the zero used by the forecast', () => {
  const plan = normalisePlan({
    age: '',
    sipp: '',
    work: '',
    isa: '',
    monthly: '',
    target: '',
    salaryIncrease: '',
  });

  assert.equal(plan.age, DEFAULT_PLAN.age);
  assert.equal(plan.target, DEFAULT_PLAN.target);
  assert.equal(plan.sipp, 0);
  assert.equal(plan.work, 0);
  assert.equal(plan.isa, 0);
  assert.equal(plan.monthly, 0);
  assert.equal(plan.salaryIncrease, 0);
});

test('snapshot history repairs totals and rejects unsafe records', () => {
  const snapshots = normaliseSnapshots([
    {
      date: '2026-08-06T00:00:00.000Z',
      sipp: 91_000,
      work: 61_000,
      isa: 2_000,
      total: 999_999,
      monthly: 2_352,
      fiAge: 58,
    },
    { date: 'not-a-date', sipp: 1, work: 2, isa: 3, monthly: 4 },
    { date: 0, sipp: 1, work: 2, isa: 3, monthly: 4 },
    { date: '2026-08-06T01:00:00.000Z', sipp: 'Infinity', work: 2, isa: 3, monthly: 4 },
    { date: '2026-08-06T02:00:00.000Z', sipp: null, work: 2, isa: 3, monthly: 4 },
    { date: '2026-08-06T03:00:00.000Z', sipp: true, work: 2, isa: 3, monthly: 4 },
    { date: '2026-08-06T04:00:00.000Z', sipp: 1, work: 2, isa: 3, monthly: '' },
    { date: '2026-08-06T05:00:00.000Z', sipp: [], work: 2, isa: 3, monthly: 4 },
    { date: '2026-08-06T06:00:00.000Z', sipp: 1, work: 2, isa: 3, monthly: '   ' },
  ]);

  assert.deepEqual(snapshots, [{
    date: '2026-08-06T00:00:00.000Z',
    sipp: 91_000,
    work: 61_000,
    isa: 2_000,
    total: 154_000,
    monthly: 2_352,
    fiAge: 58,
  }]);
});

test('snapshot history has a deliberate ten-year monthly ceiling', () => {
  const history = Array.from({ length: 250 }, (_, index) => ({
    date: new Date(Date.UTC(2020, 0, index + 1)).toISOString(),
    sipp: index,
    work: 0,
    isa: 0,
    monthly: 0,
    fiAge: null,
  }));

  const snapshots = normaliseSnapshots(history);
  assert.equal(snapshots.length, 240);
  assert.equal(snapshots[0].sipp, 10);
  assert.equal(snapshots.at(-1).sipp, 249);
});

test('an all-zero snapshot remains valid for an empty starting plan', () => {
  const snapshots = normaliseSnapshots([{
    date: '2026-08-06T00:00:00.000Z',
    sipp: 0,
    work: 0,
    isa: 0,
    monthly: 0,
    fiAge: null,
  }]);

  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].total, 0);
});
