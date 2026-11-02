# n8n-nodes-hyperline

This is an n8n community node for [Hyperline](https://www.hyperline.co), the billing platform for subscriptions, usage-based pricing, quotes and invoicing. It adds two nodes:

- **Hyperline**: covers the Hyperline API: customers, subscriptions, invoices, quotes, catalog, usage, credits, wallets, accounting reports and revenue recognition (37 resources, 237 operations).
- **Hyperline Trigger**: start a workflow from any Hyperline webhook event, including custom action buttons.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Trigger](#trigger) · [Things to know](#things-to-know) · [Development](#development)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation and install `n8n-nodes-hyperline`.

## Credentials

Create an API key in Hyperline under **Settings > API > New API key** with read and write scopes. The Hyperline Trigger also needs access to webhooks.

In n8n, create a **Hyperline API** credential:

| Field | Value |
| --- | --- |
| Environment | **Production** for `prod_` keys, **Sandbox** for `test_` keys |
| API Key | The key you created |

Sandbox and production are different hosts (`sandbox.api.hyperline.co` and `api.hyperline.co`). A key sent to the wrong host is rejected with a 401 that looks like a bad key. When that happens, the node checks the key prefix against the Environment and tells you if they do not match.

The credential also works with the built-in **HTTP Request** node (Authentication: Predefined Credential Type > Hyperline API) for any endpoint this node does not cover.

## Operations

| Resource | Operations |
| --- | --- |
| Accounting Report | Export General Ledger, Export Income Statement |
| Aggregator | Create, Delete, Get, Get Many, Get Usage, Get Usage by Customer, Get Usage Events, Get Usage Timeseries, Update |
| Approval Workflow | Create, Delete, Get, Get Many, Update |
| Audit Log | Get Many |
| Bank Account | Get, Get Many, Get Transactions |
| Billable Event | Delete, Get Many, Send, Send Batch |
| Catalog | Create Draft, Discard Draft, Export, Get Draft, Get Many Versions, Get Version, Publish Draft, Revert to Version |
| Coupon | Create, Delete, Get, Get Many, Update |
| Custom Property | Create, Delete, Get Many, Update |
| Customer | Archive, Bulk Update Providers, Create, Create Many, Delete, Get, Get ARR History, Get Many, Get Portal URL, Get Shipping Destination, Get Tax Rates, Get Valuation, Set Shipping Destination, Unarchive, Update |
| Customer Address | Create, Delete, Get Many, Update |
| Customer Credit | Create, Get, Get Many, Get Many for Customer, Get Portal Settings, Get Transactions, Purchase, Record Usage, Top Up, Update, Update Portal Settings, Update Transaction |
| Customer Feature | Delete, Resolve, Set |
| Customer Payment Method | Delete, Get, Get Many, Import |
| Customer Segment | Create, Delete, Get, Get Many, Update |
| Customer Usage | Get, Get Events, Get Many, Get Timeseries |
| Export | Create, Download, Get, Get Many |
| Feature | Archive, Create, Delete, Get, Get Many, Unarchive, Update |
| File | Create Upload URL, Delete, Download, Download Upload, Get Many, Upload |
| Invoice | Charge, Create, Create Credit Note, Create Many, Create Transaction, Delete, Delete Transaction, Download, Get, Get Events, Get Many, Mark as Uncollectible, Send Email, Update, Upload PDF, Validate, Void |
| Price Book | Add Products, Create, Delete, Get, Get Many, Remove Product, Update |
| Price Configuration | Create, Delete, Get, Get Many, Update Prices |
| Product | Archive, Create, Delete, Get, Get Many, Unarchive, Update |
| Product Feature | Delete, Get Many, Set |
| Promotion Code | Create, Delete, Get, Get Many, Update |
| Quote | Approve, Create, Download, Download File, Duplicate, Finalize, Get, Get Approvals, Get Many, Get Signers, Get Valuation, Redraft, Send, Set Signers, Sign, Update, Void |
| Quote Template | Get, Get Many |
| Revenue Recognition | Export Recognized Summary, Export Waterfall, Get Many Schedules, Get Schedule, Get Schedule Adjustments, Get Slice, Get Unbilled Revenue, Get Waterfall, Get Waterfall Cell, Preview Schedule Reshape, Reshape Schedule |
| Role | Get, Get Many |
| Subscription | Activate, Apply Multiple Updates, Apply Update, Cancel, Create, Get, Get ARR History, Get Estimates, Get Many, Get Valuation, Pause, Preview Timeline, Reactivate, Refresh All, Refresh Seat Products, Reinstate, Renew, Simulate Updates, Update |
| Subscription Phase | Get, Get Many, Transition to Next Phase |
| Subscription Template | Create, Create Configuration, Delete, Delete Configuration, Get, Get Many, Update, Update Configuration |
| Subscription Transition | Cancel, Create, Get, Get Many, Preview |
| Tax Rate | Create, Delete, Get, Get Many, Update |
| Transaction | Create, Delete, Get, Get Many, Refund |
| User | Get, Get Many |
| Wallet | Create, Get, Get Many, Get Settings, Get Transactions, Load, Revert Load, Update, Update Settings |

Every Get Many operation supports Return All, with automatic pagination where Hyperline pages the list, plus the main filters Hyperline offers for that list (status, customer, external ID, dates and so on).

Customers, subscriptions, invoices, quotes and products can be picked from a searchable list or entered by ID. Other records are entered by ID.

Create and Update operations expose the common fields as a form. Nested structures, such as subscription products and phases, price tiers, segment rules or custom properties, go in the JSON fields (for example **Additional Body Fields (JSON)**), using the field names from the [Hyperline API reference](https://docs.hyperline.co/api-reference). Form fields win over the same key in the JSON.

Downloads (invoice and quote PDFs, exports, files) return a binary item. Uploads (files, invoice PDFs, signed quotes) read a binary field from the input item.

### Not covered

A few parts of the API are left out on purpose: ledger management (journal entries, ledgers, ledger accounts, accounting rules), AI billing and agent monitoring, account analytics, invoicing entities, payments, organisation, company and app settings, and the OAuth endpoints. The tests list each one with its reason (`NOT_COVERED` in `test/description.test.ts`). Use the HTTP Request node with the Hyperline API credential for these.

## Trigger

The Hyperline Trigger registers a webhook endpoint in Hyperline when the workflow is activated, and removes it when the workflow is deactivated.

- Pick specific events or **All Events**. The list of 120+ event types comes from Hyperline's API spec.
- Every delivery is verified: the trigger creates the endpoint with its own signing secret and checks the `webhook-signature` HMAC and timestamp (deliveries older than five minutes are rejected).
- Each item includes `webhook_id`, which stays the same when Hyperline retries a delivery, so you can skip duplicates.
- **Custom Action Types** (under Options) limits Custom Action events to the action types you list, for example `sync_quote`, so one Hyperline button can drive one workflow.

## Things to know

- **Amounts are in cents** everywhere: `unit_amount: 1999` is 19.99.
- **External IDs are not unique in Hyperline.** Creating a customer with an external ID that already exists succeeds and makes a duplicate. Check with Customer > Get Many > Filters > External ID first.
- **Delete a customer by archiving it first.** Hyperline only deletes archived customers.
- **Tax IDs need their country prefix** (`DE308802046`, not `308802046`), otherwise Hyperline stores them as invalid.
- **Customer > Get Many includes archived customers** unless you filter by status.
- IDs only exist in the environment they were created in. A sandbox `cus_...` ID returns 404 in production.
- **Dates are sent in UTC.** Values from date pickers are read in the workflow's timezone and converted, because Hyperline expects UTC timestamps. Fields that take a calendar date (report periods, for example) are sent as `YYYY-MM-DD`.
- **Billable events** (previously shown as "Usage Event") go to Hyperline's separate ingestion host. Existing workflows keep working; only the display name changed.

## Compatibility

Built with `@n8n/node-cli` 0.54 and tested against n8n 2.x. Requires n8n 1.x or later with `n8nNodesApiVersion` 1.

## Development

```bash
npm install
npm run dev        # runs n8n with the nodes linked, rebuilding on changes
npm run lint       # n8n community node rules
npm test           # description, signature and helper tests
npm run build
```

The tests check every operation against Hyperline's OpenAPI spec: each URL and method must exist, and each query and body parameter the node sends must be one the endpoint accepts. A coverage test fails when an endpoint in the spec has no operation and is not listed in `NOT_COVERED` with a reason. When Hyperline ships API changes, refresh the spec fixture and the trigger's event list, then run the tests to see which new endpoints need an operation:

```bash
npm run sync:openapi
```

To check only some resources while working on them:

```bash
HYPERLINE_RESOURCES=coupon,taxRate npx vitest run
```

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Hyperline API reference](https://docs.hyperline.co/api-reference)
- [Hyperline webhooks](https://docs.hyperline.co/developers/webhooks)
