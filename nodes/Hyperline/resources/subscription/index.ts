import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	customerBodyLocator,
	jsonBodyProperty,
	jsonParameter,
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
	'contract_end__gte',
	'contract_end__lte',
	'renew_automatically',
	'updated_at__gte',
];

const arrHistoryQueryParameters = ['occurred_at__gte', 'occurred_at__lte'];

/** Operations that send a subscription update: apply one, apply several, or simulate them. */
const UPDATE_OPERATIONS = ['applyMultipleUpdates', 'applyUpdate', 'simulateUpdates'];

const UPDATES_PLACEHOLDER = `[
  { "type": "update_count", "payload": { "product_id": "itm_...", "count": 5 } },
  { "type": "remove_product", "payload": { "product_id": "itm_..." } }
]`;

const CHARGE_LINE_ITEMS_PLACEHOLDER = `[
  { "product_id": "itm_...", "unit_amount": 5000, "units_count": 1 }
]`;

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
				name: 'Apply Multiple Updates',
				value: 'applyMultipleUpdates',
				action: 'Apply multiple updates to a subscription',
				description: 'Apply several changes to a subscription at once, in one atomic operation',
				method: 'POST',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/update-many',
			}),
			operation({
				name: 'Apply Update',
				value: 'applyUpdate',
				action: 'Apply an update to a subscription',
				description:
					'Apply one change to a subscription, such as adding a product, changing a quantity or a price',
				method: 'POST',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/update',
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
				name: 'Get ARR History',
				value: 'getArrHistory',
				action: 'Get the ARR history of a subscription',
				description:
					'List every ARR change of a subscription with its previous and new fixed, variable and total values, latest first',
				method: 'GET',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/arr-history',
				output: 'list',
			}),
			operation({
				name: 'Get Estimates',
				value: 'getEstimates',
				action: 'Get the estimates of a subscription',
				description: 'Get the billing estimates of a subscription',
				method: 'GET',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/estimates',
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
				name: 'Get Valuation',
				value: 'getValuation',
				action: 'Get the valuation of a subscription',
				description:
					'Get the contract value, recurring contract value and ARR of a subscription, optionally broken down by period',
				method: 'GET',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/valuation',
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
				name: 'Preview Timeline',
				value: 'previewTimeline',
				action: 'Preview the timeline of a subscription',
				description: 'Preview the upcoming billing events of a subscription',
				method: 'GET',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/preview-timeline',
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
				name: 'Refresh All',
				value: 'refreshAll',
				action: 'Refresh all subscriptions',
				description: 'Ask Hyperline to refresh every subscription of the account',
				method: 'POST',
				url: '/v1/subscriptions/refresh',
				output: 'success',
			}),
			operation({
				name: 'Refresh Seat Products',
				value: 'refreshSeatProducts',
				action: 'Refresh the seat products of a subscription',
				description:
					'Update the seat counts of the seat-based products of a subscription from their configured data loader query',
				method: 'POST',
				url: '=/v2/subscriptions/{{$parameter.subscription}}/refresh-seat-products',
				output: 'success',
			}),
			operation({
				name: 'Reinstate',
				value: 'reinstate',
				action: 'Reinstate a subscription',
				description:
					'Revert a subscription that is cancelled or scheduled for cancellation to active',
				method: 'POST',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/reinstate',
			}),
			operation({
				name: 'Renew',
				value: 'renew',
				action: 'Renew a subscription',
				description:
					'Fast-forward a subscription to a date, generating every invoice in between, for example to pre-bill',
				method: 'POST',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/renew',
			}),
			operation({
				name: 'Simulate Updates',
				value: 'simulateUpdates',
				action: 'Simulate updates to a subscription',
				description:
					'Preview the invoice and billing impact of changes to a subscription without applying them',
				method: 'POST',
				url: '=/v1/subscriptions/{{$parameter.subscription}}/simulate-updates',
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
		displayOptions: show([
			'activate',
			'applyMultipleUpdates',
			'applyUpdate',
			'cancel',
			'get',
			'getArrHistory',
			'getEstimates',
			'getValuation',
			'pause',
			'previewTimeline',
			'reactivate',
			'refreshSeatProducts',
			'reinstate',
			'renew',
			'simulateUpdates',
			'update',
		]),
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

	// Reinstate
	{
		displayName: 'Options',
		name: 'reinstateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['reinstate']),
		options: [
			bodyOption({
				displayName: 'Invoicing Mode',
				name: 'invoicingMode',
				type: 'options',
				options: [
					{
						name: 'Charge Full Period',
						value: 'charge_full_period',
						description: 'Bill the cancelled periods as if the subscription never stopped',
					},
					{
						name: 'Prorate Remaining Period',
						value: 'prorate_remaining_period',
						description: 'Skip the gap and bill the prorated rest of the period from the resume date',
					},
					{
						name: 'Resume at Next Cycle',
						value: 'resume_at_next_cycle',
						description: 'Skip the gap without a catch-up invoice',
					},
				],
				default: 'resume_at_next_cycle',
				description:
					'How the gap is invoiced when a fully cancelled subscription resumes. Defaults to Resume at Next Cycle.',
			}, 'invoicing_mode'),
			bodyOption({
				displayName: 'Reactivate At',
				name: 'reactivateAt',
				type: 'dateTime',
				default: '',
				description:
					'Date a fully cancelled subscription resumes from. A past date must be after the cancellation date, a future date schedules the reinstatement. Defaults to now.',
			}, 'reactivate_at'),
		],
	},

	// Reactivate and Reinstate
	jsonParameter({
		displayName: 'Charge Line Items (JSON)',
		name: 'chargeLineItems',
		property: 'charge_line_items',
		shape: 'array',
		default: '',
		displayOptions: show(['reactivate', 'reinstate']),
		description:
			'Custom charge for the stopped period, billed instead of the invoicing mode on an immediate resume. Each line takes a product_id and optionally a unit_amount in cents and a units_count. Leave empty to use the invoicing mode.',
		placeholder: CHARGE_LINE_ITEMS_PLACEHOLDER,
	}),

	// Renew
	{
		displayName: 'Renew Up To',
		name: 'upTo',
		type: 'dateTime',
		required: true,
		default: '',
		description:
			'Date up to which the subscription is renewed, exclusive. Hyperline generates every invoice until then, up to 36 renewals.',
		displayOptions: show(['renew']),
		routing: { send: { type: 'body', property: 'up_to' } },
	},

	// Apply Update, Apply Multiple Updates and Simulate Updates
	{
		displayName: 'Update Type',
		name: 'updateType',
		type: 'options',
		required: true,
		options: [
			{ name: 'Add Coupon', value: 'add_coupon' },
			{ name: 'Add Product', value: 'add_product' },
			{ name: 'Remove Coupon', value: 'remove_coupon' },
			{ name: 'Remove Product', value: 'remove_product' },
			{
				name: 'Update Prices',
				value: 'update_prices',
				description: 'Change the prices of a product',
			},
			{
				name: 'Update Quantity',
				value: 'update_count',
				description: 'Change the quantity of a product',
			},
		],
		default: 'update_count',
		displayOptions: show(['applyUpdate']),
		routing: { send: { type: 'body', property: 'type' } },
	},
	jsonParameter({
		displayName: 'Payload (JSON)',
		name: 'payload',
		property: 'payload',
		required: true,
		displayOptions: show(['applyUpdate']),
		description:
			'Details of the update, which depend on the update type. For Update Quantity: {"product_id": "itm_...", "count": 5}. Amounts are in cents.',
		placeholder: '{\n  "product_id": "itm_...",\n  "count": 5\n}',
	}),
	jsonParameter({
		displayName: 'Updates (JSON)',
		name: 'updates',
		property: 'updates',
		shape: 'array',
		required: true,
		displayOptions: show(['applyMultipleUpdates', 'simulateUpdates']),
		description:
			'Updates to apply together, each with a type (add_product, remove_product, add_coupon, remove_coupon, update_count or update_prices) and a payload. Amounts are in cents.',
		placeholder: UPDATES_PLACEHOLDER,
	}),
	{
		displayName: 'Application Schedule',
		name: 'applicationSchedule',
		type: 'options',
		required: true,
		options: [
			{ name: 'Immediately', value: 'immediately' },
			{
				name: 'Scheduled',
				value: 'scheduled',
				description: 'Apply the update on the Apply At date',
			},
		],
		default: 'immediately',
		description: 'When the update takes effect',
		displayOptions: show(UPDATE_OPERATIONS),
		routing: { send: { type: 'body', property: 'application_schedule' } },
	},
	{
		displayName: 'Apply At',
		name: 'applyAt',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'Date the update takes effect',
		displayOptions: {
			show: { resource: [RESOURCE], operation: UPDATE_OPERATIONS, applicationSchedule: ['scheduled'] },
		},
		routing: { send: { type: 'body', property: 'apply_at' } },
	},
	{
		displayName: 'Payment Schedule',
		name: 'paymentSchedule',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Custom Date',
				value: 'custom',
				description: 'Charge the update on the Charge At date',
			},
			{
				name: 'Immediately',
				value: 'immediately',
				description: 'Charge the update right away',
			},
			{
				name: 'Next Invoice',
				value: 'next_invoice',
				description: 'Add the update to the next invoice of the subscription',
			},
		],
		default: 'next_invoice',
		description: 'When the amount resulting from the update is charged',
		displayOptions: show(UPDATE_OPERATIONS),
		routing: { send: { type: 'body', property: 'payment_schedule' } },
	},
	{
		displayName: 'Charge At',
		name: 'chargeAt',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'Date the update is charged. Must be in the future.',
		displayOptions: {
			show: { resource: [RESOURCE], operation: UPDATE_OPERATIONS, paymentSchedule: ['custom'] },
		},
		routing: { send: { type: 'body', property: 'charge_at' } },
	},
	{
		displayName: 'Calculation Method',
		name: 'calculationMethod',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Do Not Charge',
				value: 'do_not_charge',
			},
			{
				name: 'Pay in Full',
				value: 'pay_in_full',
				description: 'Charge the full billing period',
			},
			{
				name: 'Pro Rata',
				value: 'pro_rata',
				description: 'Charge only the rest of the current billing period',
			},
		],
		default: 'pro_rata',
		description: 'How the amount of the update is calculated',
		displayOptions: show(UPDATE_OPERATIONS),
		routing: { send: { type: 'body', property: 'calculation_method' } },
	},
	{
		displayName: 'Options',
		// Not `updateOptions`: the linter reads any collection named *update* as Update Fields
		name: 'changeOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(UPDATE_OPERATIONS),
		options: [
			bodyOption({
				displayName: 'Precision',
				name: 'precision',
				type: 'options',
				options: [
					{
						name: 'Calendar Days',
						value: 'calendar_days',
						description: 'Prorate on whole calendar days',
					},
					{
						name: 'Milliseconds',
						value: 'milliseconds',
						description: 'Prorate on the exact elapsed time',
					},
				],
				default: 'calendar_days',
				description: 'Granularity used to prorate the update amount. Defaults to Calendar Days.',
			}),
			bodyOption({
				displayName: 'Refund Method',
				name: 'refundMethod',
				type: 'options',
				options: REFUND_METHOD_OPTIONS,
				default: 'original_payment_method',
				description:
					'Where the refund goes when the update generates a credit note, for example after a seat reduction. Defaults to the setting of the invoicing entity.',
			}, 'refund_method'),
		],
	},

	// Get Valuation
	{
		displayName: 'Options',
		name: 'valuationOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['getValuation']),
		options: [
			queryOption({
				displayName: 'Granularity',
				name: 'granularity',
				type: 'options',
				options: [
					{ name: 'Month', value: 'month' },
					{ name: 'Quarter', value: 'quarter' },
					{ name: 'Year', value: 'year' },
				],
				default: 'month',
				description:
					'Adds a breakdown by period to the contract value and the recurring contract value',
			}),
		],
	},

	// Preview Timeline
	{
		displayName: 'Options',
		name: 'timelineOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['previewTimeline']),
		options: [
			queryOption({
				displayName: 'Max Events',
				name: 'maxEvents',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1 },
				description: 'Maximum number of events to return',
			}, 'max_events'),
			queryOption({
				displayName: 'Starts At',
				name: 'startsAt',
				type: 'dateTime',
				default: '',
				description: 'Start of the previewed period',
			}, 'starts_at'),
			queryOption({
				displayName: 'Until',
				name: 'until',
				type: 'dateTime',
				default: '',
				description: 'End of the previewed period',
			}),
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
				displayName: 'Contract End After',
				name: 'contractEndAfter',
				type: 'dateTime',
				default: '',
				description: 'Only subscriptions whose active contract ends on or after this date',
			}, 'contract_end__gte'),
			queryOption({
				displayName: 'Contract End Before',
				name: 'contractEndBefore',
				type: 'dateTime',
				default: '',
				description: 'Only subscriptions whose active contract ends on or before this date',
			}, 'contract_end__lte'),
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
				displayName: 'Renews Automatically',
				name: 'renewAutomatically',
				type: 'boolean',
				default: true,
				description:
					'Whether to return only subscriptions whose active contract renews automatically (on) or does not (off)',
			}, 'renew_automatically'),
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
			queryOption({
				displayName: 'Updated After',
				name: 'updatedAfter',
				type: 'dateTime',
				default: '',
			}, 'updated_at__gte'),
		],
	},

	// Get ARR History
	...paginationProperties(show(['getArrHistory']), 'cursor', arrHistoryQueryParameters),
	{
		displayName: 'Filters',
		name: 'arrHistoryFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getArrHistory']),
		options: [
			queryOption({
				displayName: 'Occurred After',
				name: 'occurredAfter',
				type: 'dateTime',
				default: '',
				description: 'Only ARR changes that occurred at or after this date',
			}, 'occurred_at__gte'),
			queryOption({
				displayName: 'Occurred Before',
				name: 'occurredBefore',
				type: 'dateTime',
				default: '',
				description: 'Only ARR changes that occurred at or before this date',
			}, 'occurred_at__lte'),
		],
	},
];
