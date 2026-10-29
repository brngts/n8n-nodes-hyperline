import type { INodeProperties } from 'n8n-workflow';
import {
	binaryPropertyName,
	bodyOption,
	byDisplayName,
	customerBodyLocator,
	jsonBodyProperty,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { LANGUAGE_OPTIONS, REFUND_METHOD_OPTIONS } from '../../shared/options';
import { pdfToBinary } from '../../shared/postReceive';
import { sendLineItems } from './lineItems';

const RESOURCE = 'invoice';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const invoiceGetManyQueryParameters = [
	'customer_id',
	'customer_external_id',
	'subscription_id',
	'status',
	'type',
	'invoice_number',
	'invoicing_entity_id',
	'issued_at__gte',
	'issued_at__lte',
	'due_at__lte',
	'updated_at__gte',
	'sort',
	'order',
];

const INVOICE_STATUS_OPTIONS = [
	{ name: 'All', value: 'all' },
	{ name: 'Closed', value: 'closed' },
	{ name: 'Draft', value: 'draft' },
	{ name: 'Error', value: 'error' },
	{ name: 'Finalized', value: 'finalized' },
	{ name: 'Grace Period', value: 'grace_period' },
	{ name: 'Late', value: 'late' },
	{ name: 'Open', value: 'open' },
	{ name: 'Outstanding', value: 'outstanding' },
	{ name: 'Paid', value: 'paid' },
	{ name: 'Partially Paid', value: 'partially_paid' },
	{ name: 'Pending Approval', value: 'pending_approval' },
	{ name: 'Refunded', value: 'refunded' },
	{ name: 'To Pay', value: 'to_pay' },
	{ name: 'To Reconcile', value: 'to_reconcile' },
	{ name: 'Uncollectible', value: 'uncollectible' },
	{ name: 'Voided', value: 'voided' },
];

const sharedInvoiceFields: INodeProperties[] = [
	bodyOption({
		displayName: 'Custom Note',
		name: 'customNote',
		type: 'string',
		default: '',
		description: 'Note printed on the invoice',
	}, 'custom_note'),
	bodyOption({
		displayName: 'Issue Date',
		name: 'emittedAt',
		type: 'dateTime',
		default: '',
	}, 'emitted_at'),
	bodyOption({
		displayName: 'Purchase Order',
		name: 'purchaseOrder',
		type: 'string',
		default: '',
	}, 'purchase_order'),
	bodyOption({
		displayName: 'Reference',
		name: 'reference',
		type: 'string',
		default: '',
		description: 'Identifier that eases payment reconciliation, for example on bank transfers',
	}),
	bodyOption({
		displayName: 'Subscription ID',
		name: 'subscriptionId',
		type: 'string',
		default: '',
		placeholder: 'e.g. sub_amiaWZ3lzDIWaoT',
	}, 'subscription_id'),
];

export const invoiceDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Charge',
				value: 'charge',
				action: 'Charge an invoice',
				description: 'Collect payment for an invoice with a saved payment method',
				method: 'POST',
				url: '=/v1/invoices/{{$parameter.invoice}}/charge',
			}),
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create an invoice',
				description: 'Create an invoice outside of a subscription',
				method: 'POST',
				url: '/v1/invoices',
			}),
			operation({
				name: 'Create Credit Note',
				value: 'createCreditNote',
				action: 'Create a credit note for an invoice',
				description: 'Issue a full or partial credit note against an invoice',
				method: 'POST',
				url: '=/v1/invoices/{{$parameter.invoice}}/credit-notes',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete an invoice',
				description: 'Delete a draft invoice',
				method: 'DELETE',
				url: '=/v1/invoices/{{$parameter.invoice}}',
				output: 'success',
			}),
			operation({
				name: 'Download',
				value: 'download',
				action: 'Download an invoice',
				description: 'Download the PDF of an invoice',
				method: 'GET',
				url: '=/v2/invoices/{{$parameter.invoice}}/download',
				output: [pdfToBinary('invoice', 'invoice')],
				request: {
					encoding: 'arraybuffer',
					json: false,
					headers: { Accept: 'application/pdf' },
				},
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get an invoice',
				description: 'Get an invoice by ID',
				method: 'GET',
				url: '=/v2/invoices/{{$parameter.invoice}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many invoices',
				description: 'List invoices and credit notes',
				method: 'GET',
				url: '/v2/invoices',
				output: 'list',
			}),
			operation({
				name: 'Mark as Uncollectible',
				value: 'markUncollectible',
				action: 'Mark an invoice as uncollectible',
				description: 'Write off an invoice that will not be paid',
				method: 'POST',
				url: '=/v1/invoices/{{$parameter.invoice}}/uncollectible',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update an invoice',
				description: 'Update a draft invoice',
				method: 'PATCH',
				url: '=/v1/invoices/{{$parameter.invoice}}',
			}),
			operation({
				name: 'Void',
				value: 'void',
				action: 'Void an invoice',
				description: 'Void an invoice, which issues a credit note for it',
				method: 'POST',
				url: '=/v1/invoices/{{$parameter.invoice}}/void',
			}),
		],
		'get',
	),
	recordLocator({
		name: 'invoice',
		displayName: 'Invoice',
		searchListMethod: 'getInvoices',
		searchable: true,
		idPrefix: 'inv_',
		displayOptions: show([
			'charge',
			'createCreditNote',
			'delete',
			'download',
			'get',
			'markUncollectible',
			'update',
			'void',
		]),
	}),

	// Create
	customerBodyLocator(show(['create']), 'The customer to invoice'),
	{
		displayName: 'Line Items',
		name: 'lineItems',
		type: 'fixedCollection',
		placeholder: 'Add Line Item',
		typeOptions: { multipleValues: true },
		default: {},
		description: 'Lines of the invoice. Amounts are in cents.',
		displayOptions: show(['create']),
		routing: { send: { preSend: [sendLineItems] } },
		options: [
			{
				displayName: 'Line Item',
				name: 'lineItem',
				values: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Period End',
						name: 'periodEnd',
						type: 'dateTime',
						default: '',
					},
					{
						displayName: 'Period Start',
						name: 'periodStart',
						type: 'dateTime',
						default: '',
					},
					{
						displayName: 'Product ID',
						name: 'productId',
						type: 'string',
						default: '',
						placeholder: 'e.g. itm_3kXODDF42QXtnL',
						description: 'Catalog product the line refers to, if any',
					},
					{
						displayName: 'Tax Rate (%)',
						name: 'taxRate',
						type: 'number',
						default: 0,
						description: 'Leave at 0 to let Hyperline determine the rate',
					},
					{
						displayName: 'Unit Amount (Cents)',
						name: 'unitAmount',
						type: 'number',
						default: 0,
						description: 'Price of one unit in cents, for example 1999 for 19.99',
					},
					{
						displayName: 'Units',
						name: 'unitsCount',
						type: 'number',
						default: 1,
					},
				],
			},
		],
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
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				placeholder: 'e.g. EUR',
				description: 'Defaults to the currency of the customer',
			}),
			bodyOption({
				displayName: 'Due Date',
				name: 'dueAt',
				type: 'dateTime',
				default: '',
				description: 'Defaults to the issue date plus the payment terms',
			}, 'due_at'),
			bodyOption({
				displayName: 'Invoicing Entity ID',
				name: 'invoicingEntityId',
				type: 'string',
				default: '',
			}, 'invoicing_entity_id'),
			...sharedInvoiceFields,
			bodyOption({
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Draft', value: 'draft', description: 'Not finalized, can still be edited' },
					{ name: 'Paid', value: 'paid', description: 'Already paid outside Hyperline' },
					{ name: 'To Pay', value: 'to_pay', description: 'Finalized and awaiting payment' },
				],
				default: 'draft',
			}),
			bodyOption({
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Credit Note', value: 'credit_note' },
					{ name: 'Document', value: 'document', description: 'A non-legal document, such as a pro forma' },
					{ name: 'Invoice', value: 'invoice' },
				],
				default: 'invoice',
			}),
		].sort(byDisplayName),
	},
	jsonBodyProperty(
		show(['create']),
		'Other invoice fields from the Hyperline API reference, such as line_items, coupons or custom_properties. Line items set above take precedence.',
		'{\n  "custom_properties": { "cost_center": "4100" }\n}',
	),

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: sharedInvoiceFields,
	},
	jsonBodyProperty(
		show(['update']),
		'Other invoice fields from the Hyperline API reference, such as line_items or custom_properties. Fields set above take precedence.',
		'{\n  "line_items": [{ "name": "Consulting", "unit_amount": 50000, "units_count": 1 }]\n}',
	),

	// Charge
	{
		displayName: 'Options',
		name: 'chargeOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['charge']),
		options: [
			bodyOption({
				displayName: 'Amount (Cents)',
				name: 'amount',
				type: 'number',
				default: 0,
				description: 'Amount to charge now. Defaults to the outstanding amount.',
			}),
			bodyOption({
				displayName: 'Payment Method ID',
				name: 'paymentMethodId',
				type: 'string',
				default: '',
				placeholder: 'e.g. pm_1xMpj5bwRqN7LM',
				description: 'Overrides the payment method set on the invoice',
			}, 'payment_method_id'),
		],
	},

	// Create Credit Note
	{
		displayName: 'Options',
		name: 'creditNoteOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['createCreditNote']),
		options: [
			bodyOption({
				displayName: 'Amount Including Tax (Cents)',
				name: 'amountIncludingTax',
				type: 'number',
				default: 0,
				description: 'Defaults to the full amount of the invoice',
			}, 'amount_including_tax'),
			bodyOption({
				displayName: 'Refund Method',
				name: 'refundMethod',
				type: 'options',
				options: REFUND_METHOD_OPTIONS,
				default: 'original_payment_method',
				description: 'Only used when Trigger Refund is on',
			}, 'refund_method'),
			bodyOption({
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Draft', value: 'draft' },
					{ name: 'To Pay', value: 'to_pay' },
				],
				default: 'to_pay',
			}),
			bodyOption({
				displayName: 'Trigger Refund',
				name: 'triggerRefund',
				type: 'boolean',
				default: false,
				description: 'Whether to refund the credit note amount to the customer',
			}, 'trigger_refund'),
		],
	},

	// Void
	{
		displayName: 'Options',
		name: 'voidOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['void']),
		options: [
			bodyOption({
				displayName: 'Send Email',
				name: 'sendEmail',
				type: 'boolean',
				default: false,
				description: 'Whether to email the resulting credit note to the customer',
			}, 'send_email'),
		],
	},

	// Download
	binaryPropertyName(show(['download'])),
	{
		displayName: 'Options',
		name: 'downloadOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['download']),
		options: [
			queryOption({
				displayName: 'Language',
				name: 'lang',
				type: 'options',
				options: LANGUAGE_OPTIONS,
				default: 'en',
				description: 'Language of the PDF. Defaults to the language of the customer.',
			}),
		],
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'cursor', invoiceGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'Customer External ID',
				name: 'customerExternalId',
				type: 'string',
				default: '',
			}, 'customer_external_id'),
			queryOption({
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				placeholder: 'e.g. cus_DKL4Xcb5VSa8CQ',
			}, 'customer_id'),
			queryOption({
				displayName: 'Due Before',
				name: 'dueBefore',
				type: 'dateTime',
				default: '',
			}, 'due_at__lte'),
			queryOption({
				displayName: 'Invoice Number',
				name: 'invoiceNumber',
				type: 'string',
				default: '',
			}, 'invoice_number'),
			queryOption({
				displayName: 'Invoicing Entity ID',
				name: 'invoicingEntityId',
				type: 'string',
				default: '',
			}, 'invoicing_entity_id'),
			queryOption({
				displayName: 'Issued After',
				name: 'issuedAfter',
				type: 'dateTime',
				default: '',
			}, 'issued_at__gte'),
			queryOption({
				displayName: 'Issued Before',
				name: 'issuedBefore',
				type: 'dateTime',
				default: '',
			}, 'issued_at__lte'),
			queryOption({
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: INVOICE_STATUS_OPTIONS,
				default: 'all',
			}),
			queryOption({
				displayName: 'Subscription ID',
				name: 'subscriptionId',
				type: 'string',
				default: '',
				placeholder: 'e.g. sub_amiaWZ3lzDIWaoT',
			}, 'subscription_id'),
			queryOption({
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Document', value: 'document' },
					{ name: 'Invoice', value: 'invoice' },
					{ name: 'Refund (Credit Note)', value: 'refund' },
				],
				default: 'invoice',
			}),
			queryOption({
				displayName: 'Updated After',
				name: 'updatedAfter',
				type: 'dateTime',
				default: '',
			}, 'updated_at__gte'),
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'Sort By',
				name: 'sort',
				type: 'options',
				options: [
					{ name: 'Created At', value: 'created_at' },
					{ name: 'Issue Date', value: 'emitted_at' },
				],
				default: 'created_at',
			}),
			queryOption({
				displayName: 'Sort Order',
				name: 'order',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'desc',
			}),
		],
	},
];
