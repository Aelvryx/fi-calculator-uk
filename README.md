# FI Tracker UK

A client-side UK financial-independence tracker with pension/ISA projections, scenario comparison, an ISA access-bridge test, pension allocation modelling and local snapshot history.

The application has no backend and sends no financial data anywhere. It is educational software, not financial advice.

## Run locally

Serve the repository with any static web server, then open `index.html` through HTTP so the ES module can load.

```sh
python3 -m http.server 4173
```

## Verify

```sh
npm ci
npm run check
```

The test suite locks the current-year timeline, tax bands and taper, taxable State Pension treatment, age-57 ISA bridge, SIPP/workplace allocation boundary and browser integration contract. See [ASSUMPTIONS.md](ASSUMPTIONS.md) for sources and model limits.
