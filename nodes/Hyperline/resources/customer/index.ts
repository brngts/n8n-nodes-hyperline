import type { INodeProperties } from 'n8n-workflow';
import {
	LIST_VALUE,
	bodyOption,
	byDisplayName,
	jsonArrayBodyParameter,
	jsonBodyProperty,
	jsonParameter,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { LANGUAGE_OPTIONS, PAYMENT_METHOD_OPTIONS } from '../../shared/options';
import { dateQueryOption } from '../../shared/dates';

const RESOURCE = 'customer';

const show = (operations: string[], extra: Record<string, string[]> = {}) => ({
	show: { resource: [RESOURCE], operation: operations, ...extra },
});

const customerArrHistoryQueryParameters = ['occurred_at__gte', 'occurred_at__lte'];

const CREATE_MANY_PLACEHOLDER = `[
  {
    "batch_customer_id": "1",
    "name": "Acme Inc.",
    "currency": "EUR",
    "billing_email": "billing@acme.com"
  }
]`;

const PROVIDER_MAPPINGS_PLACEHOLDER = `[
  {
    "customer_id": "cus_DKL4Xcb5VSa8CQ",
    "provider_name": "stripe",
    "provider_account_id": "cus_PqR7..."
  }
]`;

export const customerGetManyQueryParameters = [
	'search',
	'status',
	'external_id',
	'billing_email',
	'currency',
	'country',
	'subscription_status',
	'invoicing_entity_id',
	'created_at__gte',
	'updated_at__gte',
	'sort',
	'order',
];

/** Optional fields shared by Create and Update, which accept the same body. */
function customerFields(forUpdate: boolean): INodeProperties[] {
	return [
		bodyOption({
			displayName: 'Billing Address City',
			name: 'billingAddressCity',
			type: 'string',
			default: '',
		}, 'billing_address.city'),
		bodyOption({
			displayName: 'Billing Address Country',
			name: 'billingAddressCountry',
			type: 'string',
			default: '',
			placeholder: 'e.g. DE',
			description: 'Two-letter ISO country code',
		}, 'billing_address.country'),
		bodyOption({
			displayName: 'Billing Address Line 1',
			name: 'billingAddressLine1',
			type: 'string',
			default: '',
		}, 'billing_address.line1'),
		bodyOption({
			displayName: 'Billing Address Line 2',
			name: 'billingAddressLine2',
			type: 'string',
			default: '',
		}, 'billing_address.line2'),
		bodyOption({
			displayName: 'Billing Address State',
			name: 'billingAddressState',
			type: 'string',
			default: '',
			description: 'Only used for US addresses',
		}, 'billing_address.state'),
		bodyOption({
			displayName: 'Billing Address ZIP Code',
			name: 'billingAddressZip',
			type: 'string',
			default: '',
		}, 'billing_address.zip'),
		bodyOption({
			displayName: 'Billing Email',
			name: 'billingEmail',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
			description: 'Email that receives all communications',
		}, 'billing_email'),
		bodyOption({
			displayName: 'Currency',
			name: 'currency',
			type: 'string',
			default: '',
			placeholder: 'e.g. EUR',
			description: forUpdate
				? 'Three-letter ISO currency code. Hyperline locks the currency once the customer has invoices, a wallet or a saved payment method.'
				: 'Three-letter ISO currency code',
		}),
		bodyOption({
			displayName: 'Custom Payment Delay (Days)',
			name: 'customPaymentDelay',
			type: 'number',
			default: 30,
			description: 'Payment terms in days. Leave unset to use the invoicing entity default.',
		}, 'custom_payment_delay'),
		bodyOption({
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'e.g. example.com',
		}),
		bodyOption({
			displayName: 'External ID',
			name: 'externalId',
			type: 'string',
			default: '',
			description:
				'ID of the customer in your own system. Hyperline does not enforce uniqueness, so check with Get Many before creating.',
		}, 'external_id'),
		bodyOption({
			displayName: 'Force Draft Invoices',
			name: 'forceInvoiceDraft',
			type: 'boolean',
			default: false,
			description: 'Whether invoices for this customer are created as drafts',
		}, 'force_invoice_draft'),
		{
			displayName: 'Invoice Emails',
			name: 'invoiceEmails',
			type: 'string',
			default: '',
			placeholder: 'e.g. ap@example.com, finance@example.com',
			description: 'Comma-separated emails that receive invoices, such as the payer or accounting firm',
			routing: {
				send: {
					type: 'body',
					property: 'invoice_emails',
					value:
						LIST_VALUE,
				},
			},
		},
		bodyOption({
			displayName: 'Invoice Reminders',
			name: 'invoiceRemindersEnabled',
			type: 'boolean',
			default: true,
			description: 'Whether Hyperline sends payment reminders for this customer',
		}, 'invoice_reminders_enabled'),
		bodyOption({
			displayName: 'Invoicing Entity ID',
			name: 'invoicingEntityId',
			type: 'string',
			default: '',
			description: 'The invoicing entity (seller) the customer is attached to',
		}, 'invoicing_entity_id'),
		bodyOption({
			displayName: 'Language',
			name: 'language',
			type: 'options',
			options: LANGUAGE_OPTIONS,
			default: 'en',
			description: 'Language of invoices, emails and hosted pages',
		}),
		bodyOption({
			displayName: 'Parent Organisation ID',
			name: 'organisationId',
			type: 'string',
			default: '',
			description: 'Customer ID of the parent organisation this customer belongs to',
		}, 'organisation_id'),
		bodyOption({
			displayName: 'Parent Organisation Invoicing',
			name: 'organisationInvoicing',
			type: 'options',
			options: [
				{
					name: 'Concatenate',
					value: 'concat',
					description: 'Group the invoices of this customer into the invoice of the parent',
				},
				{
					name: 'Every Invoice',
					value: 'every_invoice',
					description: 'The parent receives each invoice of this customer individually',
				},
				{
					name: 'None',
					value: 'none',
					description: 'Invoices stay on this customer',
				},
			],
			default: 'none',
			description: 'How invoices are issued when the customer has a parent organisation',
		}, 'organisation_invoicing'),
		bodyOption({
			displayName: 'Payment Method Type',
			name: 'paymentMethodType',
			type: 'options',
			options: PAYMENT_METHOD_OPTIONS,
			default: 'transfer',
			description: 'Default payment method for subscriptions and one-off invoices',
		}, 'payment_method_type'),
		bodyOption({
			displayName: 'Registration Number',
			name: 'registrationNumber',
			type: 'string',
			default: '',
		}, 'registration_number'),
		{
			displayName: 'Tax ID',
			name: 'taxId',
			type: 'string',
			default: '',
			placeholder: 'e.g. DE308802046',
			description:
				'VAT or tax number including its country prefix. Without the prefix Hyperline stores it as invalid.',
			routing: {
				send: {
					type: 'body',
					property: 'tax_ids',
					value: '={{ $value === "" ? [] : [{ value: $value }] }}',
				},
			},
		},
		bodyOption({
			displayName: 'Taxability',
			name: 'taxability',
			type: 'options',
			options: [
				{ name: 'Exempt', value: 'exempt' },
				{ name: 'Taxable', value: 'taxable' },
			],
			default: 'taxable',
		}),
		bodyOption({
			displayName: 'Type',
			name: 'type',
			type: 'options',
			options: [
				{ name: 'Corporate', value: 'corporate' },
				{ name: 'Person', value: 'person' },
			],
			default: 'corporate',
		}),
	];
}

const JSON_BODY_HINT =
	'Any other customer fields from the Hyperline API reference, such as custom_properties, shipping_address or available_payment_methods. Fields set above take precedence.';
const JSON_BODY_PLACEHOLDER = '{\n  "custom_properties": { "salesforce_account_id": "001..." }\n}';

export const customerDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Archive',
				value: 'archive',
				action: 'Archive a customer',
				description: 'Archive a customer, which is required before deleting it',
				method: 'PUT',
				url: '=/v1/customers/{{$parameter.customer}}/archive',
			}),
			operation({
				name: 'Bulk Update Providers',
				value: 'bulkUpdateProviders',
				action: 'Bulk update customer provider mappings',
				description:
					'Link many customers to their records in a connected provider, with a result per customer',
				method: 'POST',
				url: '/v1/customers/providers-bulk-update',
			}),
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a customer',
				description: 'Create a customer',
				method: 'POST',
				url: '/v1/customers',
			}),
			operation({
				name: 'Create Many',
				value: 'createMany',
				action: 'Create many customers',
				description: 'Create up to 50 customers in one request, with a result per customer',
				method: 'POST',
				url: '/v1/customers/batch',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a customer',
				description: 'Permanently delete an archived customer',
				method: 'DELETE',
				url: '=/v1/customers/{{$parameter.customer}}',
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a customer',
				description: 'Get a customer by ID',
				method: 'GET',
				url: '=/v2/customers/{{$parameter.customer}}',
			}),
			operation({
				name: 'Get ARR History',
				value: 'getArrHistory',
				action: 'Get the ARR history of a customer',
				description: 'List the ARR changes of each subscription of a customer, latest first',
				method: 'GET',
				url: '=/v1/customers/{{$parameter.customer}}/arr-history',
				output: 'list',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many customers',
				description: 'List customers, including archived ones unless filtered by status',
				method: 'GET',
				url: '/v2/customers',
				output: 'list',
			}),
			operation({
				name: 'Get Portal URL',
				value: 'getPortalUrl',
				action: 'Get the portal URL of a customer',
				description: 'Get the link to the self-service billing portal of a customer',
				method: 'GET',
				url: '=/v1/customers/{{$parameter.customer}}/portal',
			}),
			operation({
				name: 'Get Shipping Destination',
				value: 'getShippingDestination',
				action: 'Get the shipping destination of a customer',
				description: 'Get whether a customer ships to its billing or a shipping address, and that address',
				method: 'GET',
				url: '=/v1/customers/{{$parameter.customer}}/shipping',
			}),
			operation({
				name: 'Get Tax Rates',
				value: 'getTaxRates',
				action: 'Get the tax rates of a customer',
				description: 'Get the tax rates a customer is eligible for, based on its location and tax settings',
				method: 'GET',
				url: '=/v1/customers/{{$parameter.customer}}/taxes/rates',
				output: 'list',
			}),
			operation({
				name: 'Get Valuation',
				value: 'getValuation',
				action: 'Get the valuation of a customer',
				description:
					'Get the contract value, recurring contract value and ARR of the active subscriptions of a customer, by currency',
				method: 'GET',
				url: '=/v1/customers/{{$parameter.customer}}/valuation',
			}),
			operation({
				name: 'Set Shipping Destination',
				value: 'setShippingDestination',
				action: 'Set the shipping destination of a customer',
				description: 'Ship to the billing address or to a saved shipping address of a customer',
				method: 'PUT',
				url: '=/v1/customers/{{$parameter.customer}}/shipping',
			}),
			operation({
				name: 'Unarchive',
				value: 'unarchive',
				action: 'Unarchive a customer',
				description: 'Restore an archived customer',
				method: 'PUT',
				url: '=/v1/customers/{{$parameter.customer}}/unarchive',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a customer',
				description: 'Update a customer. Only the fields you set are changed.',
				method: 'PUT',
				url: '=/v1/customers/{{$parameter.customer}}',
			}),
		],
		'get',
	),
	recordLocator({
		name: 'customer',
		displayName: 'Customer',
		searchListMethod: 'getCustomers',
		searchable: true,
		idPrefix: 'cus_',
		displayOptions: show([
			'archive',
			'delete',
			'get',
			'getArrHistory',
			'getPortalUrl',
			'getShippingDestination',
			'getTaxRates',
			'getValuation',
			'setShippingDestination',
			'unarchive',
			'update',
		]),
	}),

	// Create
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'Legal name of the customer, as printed on invoices',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: customerFields(false),
	},
	jsonBodyProperty(show(['create']), JSON_BODY_HINT, JSON_BODY_PLACEHOLDER),

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			...customerFields(true),
			bodyOption({
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			}),
		].sort(byDisplayName),
	},
	jsonBodyProperty(show(['update']), JSON_BODY_HINT, JSON_BODY_PLACEHOLDER),

	// Create Many
	jsonParameter({
		displayName: 'Customers (JSON)',
		name: 'customers',
		property: 'customers',
		shape: 'array',
		required: true,
		description:
			'Up to 50 customers with the fields of Create, each with a batch_customer_id that is unique in the request and identifies it in the result',
		placeholder: CREATE_MANY_PLACEHOLDER,
		displayOptions: show(['createMany']),
	}),

	// Bulk Update Providers
	jsonArrayBodyParameter({
		displayName: 'Provider Mappings (JSON)',
		name: 'providerMappings',
		description:
			'One entry per customer with customer_id, provider_name (such as stripe, hubspot or salesforce) and provider_account_id, the ID of the customer in the provider. A null provider_account_id removes the mapping. Add provider_id when several accounts of the same provider are connected.',
		placeholder: PROVIDER_MAPPINGS_PLACEHOLDER,
		displayOptions: show(['bulkUpdateProviders']),
	}),
	{
		displayName: 'Options',
		name: 'bulkUpdateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['bulkUpdateProviders']),
		options: [
			queryOption({
				displayName: 'Sync',
				name: 'sync',
				type: 'boolean',
				default: false,
				description:
					'Whether to sync the customers with the provider after the update. For payment providers this imports their payment methods.',
			}),
		],
	},

	// Get ARR History
	...paginationProperties(show(['getArrHistory']), 'cursor', customerArrHistoryQueryParameters),
	{
		displayName: 'Filters',
		name: 'arrHistoryFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getArrHistory']),
		options: [
			dateQueryOption({
				displayName: 'Occurred After',
				name: 'occurredAfter',
				default: '',
				description: 'Return changes that happened at or after this date',
			}, 'occurred_at__gte'),
			dateQueryOption({
				displayName: 'Occurred Before',
				name: 'occurredBefore',
				default: '',
				description: 'Return changes that happened at or before this date',
			}, 'occurred_at__lte'),
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
				description: 'Adds a breakdown of the contract values by period',
			}),
		],
	},

	// Set Shipping Destination
	{
		displayName: 'Destination',
		name: 'destination',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Billing Address',
				value: 'billing_address',
				description: 'Ship to the billing address of the customer',
			},
			{
				name: 'Shipping Address',
				value: 'shipping_address',
				description: 'Ship to a saved shipping address of the customer',
			},
		],
		default: 'shipping_address',
		displayOptions: show(['setShippingDestination']),
		routing: { send: { type: 'body', property: 'destination' } },
	},
	{
		displayName: 'Options',
		name: 'shippingOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['setShippingDestination'], { destination: ['shipping_address'] }),
		options: [
			bodyOption({
				displayName: 'Address ID',
				name: 'addressId',
				type: 'string',
				default: '',
				description:
					'Saved shipping address to ship to. Defaults to the default shipping address of the customer.',
			}, 'address_id'),
		],
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'cursor', customerGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'Billing Email',
				name: 'billingEmail',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			}, 'billing_email'),
			queryOption({
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'e.g. DE',
			}),
			queryOption({
				displayName: 'Created After',
				name: 'createdAfter',
				type: 'dateTime',
				default: '',
			}, 'created_at__gte'),
			queryOption({
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				placeholder: 'e.g. EUR',
			}),
			queryOption({
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description: 'Exact match on the ID of the customer in your own system',
			}, 'external_id'),
			queryOption({
				displayName: 'Invoicing Entity ID',
				name: 'invoicingEntityId',
				type: 'string',
				default: '',
			}, 'invoicing_entity_id'),
			queryOption({
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Free-text search across customer fields',
			}),
			queryOption({
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'All', value: 'all' },
					{ name: 'Archived', value: 'archived' },
					{ name: 'Imported', value: 'imported' },
					{ name: 'Inactive', value: 'inactive' },
				],
				default: 'active',
			}),
			queryOption({
				displayName: 'Subscription Status',
				name: 'subscriptionStatus',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Cancelled', value: 'cancelled' },
					{ name: 'Draft', value: 'draft' },
					{ name: 'Errored', value: 'errored' },
					{ name: 'None', value: 'none' },
					{ name: 'Paused', value: 'paused' },
					{ name: 'Pending', value: 'pending' },
					{ name: 'Trialing', value: 'trialing' },
				],
				default: 'active',
			}, 'subscription_status'),
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
					{ name: 'Updated At', value: 'updated_at' },
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
