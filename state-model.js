export const PLAN_FIELDS = Object.freeze([
  'age',
  'sipp',
  'work',
  'isa',
  'monthly',
  'isaMonthly',
  'target',
  'returnRate',
  'swr',
  'totalMonthly',
  'sippRedirect',
  'extraSipp',
  'extraIsa',
  'salaryIncrease',
]);

export const DEFAULT_PLAN = Object.freeze({
  age: 38,
  sipp: 90_000,
  work: 60_000,
  isa: 0,
  monthly: 2_352,
  isaMonthly: 0,
  target: 40_000,
  returnRate: 4,
  swr: 4,
  totalMonthly: 2_352,
  sippRedirect: 0,
  extraSipp: 500,
  extraIsa: 200,
  salaryIncrease: 0,
});

const PLAN_LIMITS = Object.freeze({
  age: { min: 18, max: 75, integer: true },
  sipp: { min: 0, max: 100_000_000 },
  work: { min: 0, max: 100_000_000 },
  isa: { min: 0, max: 100_000_000 },
  monthly: { min: 0, max: 1_000_000 },
  isaMonthly: { min: 0, max: 1_000_000 },
  target: { min: 10_000, max: 10_000_000 },
  returnRate: { min: 2, max: 8 },
  swr: { min: 3, max: 5 },
  totalMonthly: { min: 0, max: 1_000_000 },
  sippRedirect: { min: 0, max: 1_000_000 },
  extraSipp: { min: 0, max: 1_000_000 },
  extraIsa: { min: 0, max: 1_000_000 },
  salaryIncrease: { min: 0, max: 20 },
});

function boundedNumber(value, fallback, limits) {
  if (value === '') return limits.min === 0 ? 0 : fallback;
  if (!['number', 'string'].includes(typeof value)) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = limits.integer ? Math.floor(parsed) : parsed;
  return Math.min(limits.max, Math.max(limits.min, normalized));
}

export function normalisePlan(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return Object.fromEntries(PLAN_FIELDS.map(field => [
    field,
    boundedNumber(source[field], DEFAULT_PLAN[field], PLAN_LIMITS[field]),
  ]));
}

function validSnapshotNumber(value) {
  if (!['number', 'string'].includes(typeof value)) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100_000_000
    ? parsed
    : null;
}

export function normaliseSnapshots(raw) {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return [];
    if (typeof entry.date !== 'string') return [];
    const timestamp = Date.parse(entry.date);
    const sipp = validSnapshotNumber(entry.sipp);
    const work = validSnapshotNumber(entry.work);
    const isa = validSnapshotNumber(entry.isa);
    const monthly = validSnapshotNumber(entry.monthly);
    if (!Number.isFinite(timestamp) || [sipp, work, isa, monthly].includes(null)) return [];

    const parsedFiAge = Number(entry.fiAge);
    const fiAge = entry.fiAge === null
      ? null
      : Number.isSafeInteger(parsedFiAge) && parsedFiAge >= 18 && parsedFiAge <= 75
        ? parsedFiAge
        : null;

    return [{
      date: new Date(timestamp).toISOString(),
      sipp,
      work,
      isa,
      total: sipp + work + isa,
      monthly,
      fiAge,
    }];
  }).slice(-240);
}
