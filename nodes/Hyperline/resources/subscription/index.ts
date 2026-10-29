import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	customerBodyLocator,
	jsonBodyProperty,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { REFUND_METHOD_OPTIONS } from '../../shared/options';

const RESOURCE = 'subscription';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const subscriptionGetManyQueryParameters = [
	'customer_id',
	'status',
	'currency',
	'activation_strategy',
	'purchase_order',
	'original_quote_id',
	'invoicing_entity_id',
];

const CREATE_JSON_PLACEHOLDER = `{
  "products": [
    {
      "id": "itm_...",
      "payment_interval": { "period": "months", "count": 1 },
      "prices": [{ "type": "fee", "amount": 10000 }]
    }
  ],
  "contract_terms": { "renew_automatically": true }
}`;

export const subscriptionDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Activate',
				value: 'activate',
				action: 'Activate a subscription',
				description: 'Activate a subscription that waits for manual activation',
				method: 'POST',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/activate',
			}),
			operation({
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a subscription',
				description: 'Cancel a subscription now or at a given date',
				method: 'POST',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/cancel',
			}),
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a subscription',
				description: 'Create a subscription for a customer',
				method: 'POST',
				url: '/v2/subscriptions',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a subscription',
				description: 'Get a subscription by ID',
				method: 'GET',
				url: '=/v2/subscriptions/{{$parameter.subscription}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many subscriptions',
				description: 'List subscriptions',
				method: 'GET',
				url: '/v2/subscriptions',
				output: 'list',
			}),
			operation({
				name: 'Pause',
				value: 'pause',
				action: 'Pause a subscription',
				description: 'Pause a subscription, optionally until a reactivation date',
				method: 'POST',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/pause',
			}),
			operation({
				name: 'Reactivate',
				value: 'reactivate',
				action: 'Reactivate a subscription',
				description: 'Resume a paused or cancelled subscription',
				method: 'POST',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/reactivate',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a subscription',
				description: 'Update the details, dates or phases of a subscription',
				method: 'PUT',
				url: '=/v2/subscriptions/{{$parameter.subscription}}',
			}),
		],
		'get',
	),
	recordLocator({
		name: 'subscription',
		displayName: 'Subscription',
		searchListMethod: 'getSubscriptions',
		searchable: false,
		idPrefix: 'sub_',
		displayOptions: show(['activate', 'cancel', 'get', 'pause', 'reactivate', 'update']),
	}),

	// Create
	customerBodyLocator(show(['create']), 'The customer to subscribe'),
	{
		displayName: 'Activation Strategy',
		name: 'activationStrategy',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Checkout',
				value: 'checkout',
				description: 'Activates once the customer completes a checkout',
			},
			{
				name: 'Manually',
				value: 'manually',
				description: 'Waits until you activate it',
			},
			{
				name: 'Start Date',
				value: 'start_date',
				description: 'Activates on the start date, or now if none is set',
			},
		],
		default: 'start_date',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'activation_strategy' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			bodyOption({
				displayName: 'CRM Opportunity ID',
				name: 'crmOpportunityId',
				type: 'string',
				default: '',
				description: 'ID of the related opportunity or deal in your CRM',
			}, 'crm_opportunity_id'),
			bodyOption({
				displayName: 'Generate Draft Invoices',
				name: 'generateDraftInvoices',
				type: 'boolean',
				default: false,
				description: 'Whether invoices from this subscription start as drafts for review',
			}, 'generate_draft_invoices'),
			bodyOption({
				displayName: 'Invoicing Entity ID',
				name: 'invoicingEntityId',
				type: 'string',
				default: '',
				description: 'Defaults to the invoicing entity of the customer',
			}, 'invoicing_entity_id'),
			bodyOption({
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			}),
			bodyOption({
				displayName: 'Purchase Order',
				name: 'purchaseOrder',
				type: 'string',
				default: '',
			}, 'purchase_order'),
			bodyOption({
				displayName: 'Start Date',
				name: 'startsAt',
				type: 'dateTime',
				default: '',
				description: 'Used when the activation strategy is Start Date',
			}, 'starts_at'),
			bodyOption({
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				description:
					'Subscription template to build from. With a template, products and phases can be left out.',
			}, 'template_id'),
		],
	},
	jsonBodyProperty(
		show(['create']),
		'Products, phases, contract terms, coupons and other fields from the Hyperline API reference. Needed unless a template is set. Amounts are in cents.',
		CREATE_JSON_PLACEHOLDER,
	),

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			bodyOption({
				displayName: 'CRM Opportunity ID',
				name: 'crmOpportunityId',
				type: 'string',
				default: '',
			}, 'crm_opportunity_id'),
			bodyOption({
				displayName: 'Generate Draft Invoices',
				name: 'generateDraftInvoices',
				type: 'boolean',
				default: false,
				description: 'Whether invoices from this subscription start as drafts for review',
			}, 'generate_draft_invoices'),
			bodyOption({
				displayName: 'Invoice Custom Note',
				name: 'invoiceCustomNote',
				type: 'string',
				default: '',
				description: 'Note printed on invoices generated by this subscription',
			}, 'invoice_custom_note'),
			bodyOption({
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			}),
			bodyOption({
				displayName: 'Purchase Order',
				name: 'purchaseOrder',
				type: 'string',
				default: '',
			}, 'purchase_order'),
			bodyOption({
				displayName: 'Start Date',
				name: 'startsAt',
				type: 'dateTime',
				default: '',
			}, 'starts_at'),
		],
	},
	jsonBodyProperty(
		show(['update']),
		'Phases, contract terms, custom properties and other fields from the Hyperline API reference. Fields set above take precedence.',
		'{\n  "custom_properties": { "contract_owner": "finance" }\n}',
	),

	// Cancel
	{
		displayName: 'Options',
		name: 'cancelOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['cancel']),
		options: [
			bodyOption({
				displayName: 'Cancel At',
				name: 'cancelAt',
				type: 'dateTime',
				default: '',
				description: 'When the subscription ends. Leave empty to cancel now.',
			}, 'cancel_at'),
			bodyOption({
				displayName: 'Pro Rata Refund',
				name: 'proRata',
				type: 'boolean',
				default: false,
				description: 'Whether to refund the unused part of the period with a credit note',
			}, 'pro_rata'),
			bodyOption({
				displayName: 'Reason',
				name: 'reason',
				type: 'string',
				default: '',
			}),
			bodyOption({
				displayName: 'Refund Method',
				name: 'refundMethod',
				type: 'options',
				options: REFUND_METHOD_OPTIONS,
				default: 'original_payment_method',
				description: 'Where the refund of the resulting credit note goes',
			}, 'refund_method'),
		],
	},

	// Pause
	{
		displayName: 'Options',
		name: 'pauseOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['pause']),
		options: [
			bodyOption({
				displayName: 'Reactivate At',
				name: 'reactivateAt',
				type: 'dateTime',
				default: '',
				description: 'Date the subscription resumes automatically',
			}, 'reactivate_at'),
		],
	},

	// Reactivate
	{
		displayName: 'Options',
		name: 'reactivateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['reactivate']),
		options: [
			bodyOption({
				displayName: 'Invoicing Mode',
				name: 'invoicingMode',
				type: 'options',
				options: [
					{
						name: 'Charge Full Period',
						value: 'charge_full_period',
						description: 'Bill the paused periods as if the subscription never stopped',
					},
					{
						name: 'Prorate Remaining Period',
						value: 'prorate_remaining_period',
						description: 'Bill only the rest of the current period',
					},
					{
						name: 'Resume at Next Cycle',
						value: 'resume_at_next_cycle',
						description: 'Start billing again from the next cycle',
					},
				],
				default: 'prorate_remaining_period',
				description: 'How the gap is invoiced when the subscription resumes',
			}, 'invoicing_mode'),
			bodyOption({
				displayName: 'Reactivate At',
				name: 'reactivateAt',
				type: 'dateTime',
				default: '',
				description:
					'Date the subscription resumes from. A future date schedules the reactivation. Defaults to now.',
			}, 'reactivate_at'),
		],
	},

	// Get
	{
		displayName: 'Options',
		name: 'getOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['get']),
		options: [
			queryOption({
				displayName: 'Include Live Billing',
				name: 'includeLiveBilling',
				type: 'boolean',
				default: false,
				description: 'Whether to include the amounts billed so far in the current period',
			}, 'include_live_billing'),
		],
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'offset', subscriptionGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'Activation Strategy',
				name: 'activationStrategy',
				type: 'options',
				options: [
					{ name: 'Checkout', value: 'checkout' },
					{ name: 'Contract Start Date', value: 'contract_start_date' },
					{ name: 'Manually', value: 'manually' },
					{ name: 'Quote', value: 'quote' },
					{ name: 'Start Date', value: 'start_date' },
				],
				default: 'start_date',
			}, 'activation_strategy'),
			queryOption({
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				placeholder: 'e.g. EUR',
			}),
			queryOption({
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				placeholder: 'e.g. cus_DKL4Xcb5VSa8CQ',
			}, 'customer_id'),
			queryOption({
				displayName: 'Invoicing Entity ID',
				name: 'invoicingEntityId',
				type: 'string',
				default: '',
			}, 'invoicing_entity_id'),
			queryOption({
				displayName: 'Original Quote ID',
				name: 'originalQuoteId',
				type: 'string',
				default: '',
				placeholder: 'e.g. quo_hXQCd5y8P3GYXa',
			}, 'original_quote_id'),
			queryOption({
				displayName: 'Purchase Order',
				name: 'purchaseOrder',
				type: 'string',
				default: '',
			}, 'purchase_order'),
			queryOption({
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'All', value: 'all' },
					{ name: 'Archived', value: 'archived' },
					{ name: 'Cancelled', value: 'cancelled' },
					{ name: 'Draft', value: 'draft' },
					{ name: 'Errored', value: 'errored' },
					{ name: 'Inactive', value: 'inactive' },
					{ name: 'Paused', value: 'paused' },
					{ name: 'Pending', value: 'pending' },
					{ name: 'Voided', value: 'voided' },
				],
				default: 'active',
			}),
		],
	},
];
