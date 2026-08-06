# Model assumptions

Checked against official UK sources on 5 August 2026.

## Statutory inputs

- **Full new State Pension:** £241.30 per week / £12,547.60 per year for 2026/27. An individual's actual entitlement depends on their National Insurance record. [Benefit and pension rates 2026 to 2027](https://www.gov.uk/government/publications/benefit-and-pension-rates-2026-to-2027/proposed-benefit-and-pension-rates-2026-to-2027)
- **Private-pension access:** modelled from age 57. The normal minimum pension age rises from 55 to 57 on 6 April 2028; protected pension ages and scheme rules can differ. [HMRC pensions tax manual](https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm062215)
- **Income Tax:** 2026/27 England, Wales and Northern Ireland rates: £12,570 Personal Allowance, £37,700 basic-rate band, £50,270 higher-rate threshold and £125,140 additional-rate threshold. The Personal Allowance tapers by £1 for each £2 above £100,000. [Rates and allowances for Income Tax](https://www.gov.uk/government/publications/rates-and-allowances-income-tax)
- **Tax-free pension cash:** normally 25%, subject to a £268,275 lump-sum allowance across arrangements. [Tax on your pension: what's tax-free](https://www.gov.uk/tax-on-pension/tax-free)

## Projection semantics

- The first row is the entered balance today. Growth and contributions are applied once before the following year's row.
- Returns, contributions and spending are expressed in today's money. Contributions are treated as end-of-year cash flow.
- Base monthly pension contributions go to workplace pension; explicit extra SIPP contributions go to SIPP.
- The safe-withdrawal rate is an illustration, not a guarantee. ISA drawdown is tax-free. The FI gate uses conservative steady-state pension income after the lump-sum allowance is exhausted, so it does not treat 25% of every withdrawal as tax-free forever. A near-term calculation can apply 25% tax-free cash only up to the explicitly supplied remaining allowance; prior crystallisations are not inferred.
- State Pension is taxable and is combined with taxable pension drawdown before Income Tax is calculated.
- Before age 57, “accessible FI” requires an ISA bridge for every year to 57. Contributions stop at the candidate retirement age, the target is withdrawn at the beginning of each bridge year, remaining assets receive the selected real return, and sustainable net income is checked again at 57.
- The plan-resilience panel is a deterministic sensitivity test, not a probability model. The cautious case reduces the selected real return by two percentage points (not below zero) and uses the lower of the selected withdrawal rate or 3.5%. The favourable case adds two percentage points to real return but leaves the selected withdrawal rate unchanged. Contributions, target income and all other assumptions stay identical.
- Scottish Income Tax, fees, market volatility, sequencing risk, protected pension ages and detailed decumulation strategies are outside this deterministic model.
