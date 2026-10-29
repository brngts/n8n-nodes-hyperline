import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	byDisplayName,
	jsonBodyProperty,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { LANGUAGE_OPTIONS, PAYMENT_METHOD_OPTIONS } from '../../shared/options';

const RESOURCE = 'customer';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

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
						'={{ $value.split(",").map((email) => email.trim()).filter((email) => email !== "") }}',
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
				name: 'Create',
				value: 'create',
				action: 'Create a customer',
				description: 'Create a customer',
				method: 'POST',
				url: '/v1/customers',
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
		displayOptions: show(['archive', 'delete', 'get', 'getPortalUrl', 'unarchive', 'update']),
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
