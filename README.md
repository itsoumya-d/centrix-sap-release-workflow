# centrix-sap-release-workflow

A TypeScript/JavaScript SAP Fiori-style purchase-order release workflow:
amount thresholds, required release codes, approver assignment, budget checks,
tax-inclusive totals, partial/full release status and audit.

## Why this exists

SAP release strategies are easy to describe and easy to get wrong. A PO below
the first threshold needs no approval; a larger PO needs one or more release
codes; every code must be used once; and a budget shortfall blocks the document
even if every approver has signed. This service makes the release contract
explicit and testable.

## Formulas

```text
taxAmount   = round(netAmount * taxRateBps / 10000)
totalAmount = netAmount + taxAmount

requiredCodes:
  total <= 10,000            -> []
  total <= 50,000            -> [A]
  total <= 250,000           -> [A, B]
  total > 250,000            -> [A, B, C]

status:
  total > budget             -> blocked
  no required codes          -> released
  some codes released        -> partially_released
  every code released        -> released
```

Each release code can be used once by a named approver. A blocked order can be
unblocked by raising the budget, after which the remaining codes can be released.

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/api/orders` | Create a purchase order |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/:id` | Order plus remaining release codes |
| POST | `/api/orders/:id/release` | Release a code |
| PATCH | `/api/orders/:id/budget` | Update budget and recompute status |
| GET | `/` | SAP Release Workflow dashboard |

## Run

```bash
npm install
npm run dev
# or
npm run build && npm start
```

The server listens on `:8096` and seeds released, draft, partially released and
blocked orders.

## Test

```bash
npm test
npm run build
```

21 Vitest tests cover tax and totals, every threshold, budget blocking, partial
and full release, duplicate/invalid codes, approver validation, budget updates,
audit history and the API/dashboard routes.

## Design tokens

From Centrix Consulting's public site:

- Heading/body: Open Sans
- Background: `#F7F7F7`
- Surface: `#FFFFFF`
- Text: `#2A2A2A`
- Accent: `#FCAF17`
- Secondary: `#5472D2`
- Radius: `4px`
- Spacing unit: `8px`

## Docker

```bash
docker build -t centrix-sap-release-workflow .
docker run --rm -p 8096:8096 centrix-sap-release-workflow
```

## Honest scope

This is a tested reference workflow, not an SAP add-on. It does not call SAP
OData, BAPI/RFC, ABAP, or a live S/4HANA system. The threshold matrix, release
codes, budget gate, tax-inclusive totals, status transitions and audit history
are real and tested.

## License

MIT
