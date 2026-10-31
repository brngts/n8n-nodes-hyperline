# n8n-nodes-hyperline

This is an n8n community node for [Hyperline](https://www.hyperline.co), the billing platform for subscriptions, usage-based pricing, quotes and invoicing. It adds two nodes:

- **Hyperline**: manage customers, subscriptions, invoices, quotes, products and usage events.
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
| Customer | Archive, Create, Delete, Get, Get Many, Get Portal URL, Unarchive, Update |
| Invoice | Charge, Create, Create Credit Note, Delete, Download (PDF), Get, Get Many, Mark as Uncollectible, Update, Void |
| Product | Get, Get Many |
| Quote | Create, Download (PDF), Get, Get Many, Send, Update, Void |
| Subscription | Activate, Cancel, Create, Get, Get Many, Pause, Reactivate, Update |
| Usage Event | Send (to the events ingestion API, for usage-based billing) |

Every Get Many operation supports Return All with automatic pagination, plus the filters Hyperline offers for that list (status, customer, external ID, dates and so on).

Customers, subscriptions, invoices, quotes and products can be picked from a searchable list or entered by ID.

Create and Update operations expose the common fields as a form. Nested structures, such as subscription products and phases, quote subscriptions or custom properties, go in **Additional Body Fields (JSON)**, using the field names from the [Hyperline API reference](https://docs.hyperline.co/api-reference). Form fields win over the same key in the JSON.

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

The tests check every operation against Hyperline's OpenAPI spec: each URL and method must exist, and each query and body parameter the node sends must be one the endpoint accepts. When Hyperline ships API changes, refresh the spec fixture and the trigger's event list with:

```bash
npm run sync:openapi
```

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Hyperline API reference](https://docs.hyperline.co/api-reference)
- [Hyperline webhooks](https://docs.hyperline.co/developers/webhooks)
