import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	byDisplayName,
	idParameter,
	jsonBodyProperty,
	jsonParameter,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { dateBodyOption, dateQueryOption } from '../../shared/dates';

const RESOURCE = 'customerCredit';

const show = (operations: string[], extra: Record<string, Array<string | boolean>> = {}) => ({
	show: { resource: [RESOURCE], operation: operations, ...extra },
});

const CREDIT_URL = '=/v1/customers/{{$parameter.customer}}/credits/{{$parameter.product}}';

export const customerCreditGetManyQueryParameters = [
	'customer_id',
	'product_id',
	'updated_at__gte',
	'updated_at__lte',
];

export const customerCreditTransactionsQueryParameters = ['type', 'invoice_id'];

/** Optional fields shared by Create and Update. */
function creditFields(): INodeProperties[] {
	return [
		bodyOption({
			displayName: 'Auto Top-Up Amount Excluding Tax (Cents)',
			name: 'autoTopupAmountExcludingTax',
			type: 'number',
			default: 0,
			description:
				'Price in cents charged for each automatic top-up. Set this or Auto Top-Up Price ID.',
		}, 'auto_topup.amount_excluding_tax'),
		bodyOption({
			displayName: 'Auto Top-Up Credit Count',
			name: 'autoTopupCreditCount',
			type: 'number',
			default: 0,
			typeOptions: { minValue: 0 },
			description:
				'Number of credits each automatic top-up adds. Required for auto top-up. With a price ID it must match a full credit pack of that price.',
		}, 'auto_topup.credit_count'),
		bodyOption({
			displayName: 'Auto Top-Up Price ID',
			name: 'autoTopupPriceId',
			type: 'string',
			default: '',
			description:
				'Bundle price of the credit product used for automatic top-ups. Set this or Auto Top-Up Amount Excluding Tax.',
		}, 'auto_topup.price_id'),
		bodyOption({
			displayName: 'Low Count Threshold',
			name: 'lowCountThreshold',
			type: 'number',
			default: 0,
			description: 'Number of credits below which the balance counts as low',
		}, 'low_count_threshold'),
		bodyOption({
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
		}),
	];
}

export const customerCreditDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a customer credit',
				description: 'Create the credit balance of a customer for a credit product',
				method: 'POST',
				url: '=/v1/customers/{{$parameter.customer}}/credits',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a customer credit',
				description: 'Get the balance and configuration of a customer credit',
				method: 'GET',
				url: CREDIT_URL,
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many customer credits',
				description: 'List credit balances across all customers',
				method: 'GET',
				url: '/v1/customers/credits',
				output: 'list',
			}),
			operation({
				name: 'Get Many for Customer',
				value: 'getAllForCustomer',
				action: 'Get many credits of a customer',
				description: 'List the credit balances of one customer',
				method: 'GET',
				url: '=/v1/customers/{{$parameter.customer}}/credits',
				output: 'list',
			}),
			operation({
				name: 'Get Portal Settings',
				value: 'getPortalSettings',
				action: 'Get the portal settings of a customer credit',
				description: 'Get whether the customer can top up credits from the customer portal, and at which price',
				method: 'GET',
				url: `${CREDIT_URL}/portal-settings`,
			}),
			operation({
				name: 'Get Transactions',
				value: 'getTransactions',
				action: 'Get transactions of a customer credit',
				description: 'List the top-ups, usages and expirations of a customer credit',
				method: 'GET',
				url: `${CREDIT_URL}/transactions`,
				output: 'list',
			}),
			operation({
				name: 'Purchase',
				value: 'purchase',
				action: 'Purchase credits for a customer',
				description: 'Invoice and charge the card of the customer, granting the credits once paid',
				method: 'POST',
				url: `${CREDIT_URL}/purchase`,
			}),
			operation({
				name: 'Record Usage',
				value: 'recordUsage',
				action: 'Record usage of a customer credit',
				description: 'Deduct consumed credits from the balance of a customer',
				method: 'POST',
				url: `${CREDIT_URL}/usage`,
			}),
			operation({
				name: 'Top Up',
				value: 'topUp',
				action: 'Top up a customer credit',
				description: 'Add free credits without invoicing or charging the customer',
				method: 'POST',
				url: `${CREDIT_URL}/topup`,
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a customer credit',
				description: 'Update the name, low balance threshold or auto top-up of a customer credit',
				method: 'PUT',
				url: CREDIT_URL,
			}),
			operation({
				name: 'Update Portal Settings',
				value: 'updatePortalSettings',
				action: 'Update the portal settings of a customer credit',
				description: 'Turn customer portal top-ups on or off and set the price the customer pays',
				method: 'PUT',
				url: `${CREDIT_URL}/portal-settings`,
			}),
			operation({
				name: 'Update Transaction',
				value: 'updateTransaction',
				action: 'Update a customer credit transaction',
				description: 'Change when the credits of a credit transaction expire',
				method: 'PATCH',
				url: `${CREDIT_URL}/transactions/{{$parameter.transactionId}}`,
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
		description: 'The customer who holds the credits',
		displayOptions: show([
			'create',
			'get',
			'getAllForCustomer',
			'getPortalSettings',
			'getTransactions',
			'purchase',
			'recordUsage',
			'topUp',
			'update',
			'updatePortalSettings',
			'updateTransaction',
		]),
	}),
	{
		...recordLocator({
			name: 'product',
			displayName: 'Product',
			searchListMethod: 'getProducts',
			searchable: true,
			idPrefix: 'itm_',
			description: 'The credit product the balance is for',
			displayOptions: show(['create']),
		}),
		routing: {
			send: {
				type: 'body',
				property: 'product_id',
				value: '={{ $parameter.product }}',
			},
		},
	},
	recordLocator({
		name: 'product',
		displayName: 'Product',
		searchListMethod: 'getProducts',
		searchable: true,
		idPrefix: 'itm_',
		description: 'The credit product the balance is for',
		displayOptions: show([
			'get',
			'getPortalSettings',
			'getTransactions',
			'purchase',
			'recordUsage',
			'topUp',
			'update',
			'updatePortalSettings',
			'updateTransaction',
		]),
	}),

	// Create
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			...creditFields(),
			bodyOption({
				displayName: 'Current Balance',
				name: 'currentBalance',
				type: 'number',
				default: 0,
				description: 'Number of credits the customer starts with',
			}, 'current_balance'),
		].sort(byDisplayName),
	},

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: creditFields(),
	},
	jsonBodyProperty(
		show(['update']),
		'Other customer credit fields from the Hyperline API reference. Send "auto_topup": null to turn automatic top-ups off. Fields set above take precedence.',
		'{\n  "auto_topup": null\n}',
	),

	// Purchase and Top Up
	{
		displayName: 'Credit Count',
		name: 'creditCount',
		type: 'number',
		required: true,
		default: 1,
		typeOptions: { minValue: 1 },
		description:
			'Number of credits to add. When purchasing with a price ID, it must match a full credit pack of that price.',
		displayOptions: show(['purchase', 'topUp']),
		routing: { send: { type: 'body', property: 'credit_count' } },
	},
	{
		displayName: 'Price By',
		name: 'priceBy',
		type: 'options',
		options: [
			{
				name: 'Custom Amount',
				value: 'customAmount',
				description: 'Charge an amount of your choice for the credits',
			},
			{
				name: 'Price ID',
				value: 'priceId',
				description: 'Charge a bundle price of the credit product',
			},
		],
		default: 'priceId',
		displayOptions: show(['purchase']),
	},
	{
		displayName: 'Amount Excluding Tax (Cents)',
		name: 'amountExcludingTax',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Price of the credits in cents, for example 1000 for 10.00',
		displayOptions: show(['purchase'], { priceBy: ['customAmount'] }),
		routing: { send: { type: 'body', property: 'amount_excluding_tax' } },
	},
	{
		displayName: 'Price ID',
		name: 'priceId',
		type: 'string',
		required: true,
		default: '',
		description: 'Price of the credit product to charge. It must be of type bundle.',
		displayOptions: show(['purchase'], { priceBy: ['priceId'] }),
		routing: { send: { type: 'body', property: 'price_id' } },
	},
	{
		displayName: 'Options',
		name: 'creditOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['purchase', 'topUp']),
		options: [
			dateBodyOption({
				displayName: 'Expires At',
				name: 'expiresAt',
				default: '',
				description: 'When the added credits expire',
			}, 'expires_at'),
		],
	},

	// Record Usage
	{
		displayName: 'Credits Used',
		name: 'usageRetained',
		type: 'number',
		required: true,
		default: 1,
		description: 'Number of credits consumed, deducted from the balance',
		displayOptions: show(['recordUsage']),
		routing: { send: { type: 'body', property: 'usage_retained' } },
	},
	{
		displayName: 'Options',
		name: 'usageOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['recordUsage']),
		options: [
			bodyOption({
				displayName: 'Event ID',
				name: 'eventId',
				type: 'string',
				default: '',
				description: 'ID of the event that consumed the credits',
			}, 'event_id'),
		],
	},

	// Update Portal Settings
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		required: true,
		default: true,
		description:
			'Whether the customer can buy this credit product from the customer portal. Turning it off clears the price of the customer.',
		displayOptions: show(['updatePortalSettings']),
		routing: { send: { type: 'body', property: 'enabled' } },
	},
	{
		displayName: 'Price',
		name: 'portalPrice',
		type: 'options',
		options: [
			{
				name: 'Custom Price',
				value: 'custom',
				description: 'A price of its own for the customer, replacing any previous one',
			},
			{
				name: 'Keep Current Price',
				value: 'keep',
				description: 'Keep the price already set for the customer',
			},
			{
				name: 'Price Configuration',
				value: 'priceConfiguration',
				description: 'One of the price configurations of the credit product',
			},
		],
		default: 'priceConfiguration',
		description: 'Price the customer pays for top-ups in the portal',
		displayOptions: show(['updatePortalSettings'], { enabled: [true] }),
	},
	{
		displayName: 'Price Configuration ID',
		name: 'priceConfigurationId',
		type: 'string',
		required: true,
		default: '',
		description:
			'Price configuration of the credit product, in the price book and currency of the customer, of type bundle, volume or bulk',
		displayOptions: show(['updatePortalSettings'], {
			enabled: [true],
			portalPrice: ['priceConfiguration'],
		}),
		routing: { send: { type: 'body', property: 'price_configuration_id' } },
	},
	jsonParameter({
		displayName: 'Custom Price Configuration (JSON)',
		name: 'customPriceConfiguration',
		property: 'custom_price_configuration',
		required: true,
		default: '{\n  "type": "bundle",\n  "prices": [{ "type": "bundle", "amount": 1000, "unit_count": 100 }]\n}',
		description:
			'Price in the currency of the customer, with the same shape as a credit product price configuration (bundle, volume or bulk). Amounts are in cents.',
		displayOptions: show(['updatePortalSettings'], { enabled: [true], portalPrice: ['custom'] }),
	}),

	// Update Transaction
	idParameter({
		name: 'transactionId',
		displayName: 'Transaction ID',
		description: 'The credit transaction to update, from Get Transactions',
		displayOptions: show(['updateTransaction']),
	}),
	dateBodyOption({
		displayName: 'Expires At',
		name: 'expiresAt',
		required: true,
		default: '',
		description: 'When the credits of the transaction expire',
		displayOptions: show(['updateTransaction']),
	}, 'expires_at'),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset', customerCreditGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				placeholder: 'e.g. cus_DKL4Xcb5VSa8CQ',
			}, 'customer_id'),
			queryOption({
				displayName: 'Product ID',
				name: 'productId',
				type: 'string',
				default: '',
				placeholder: 'e.g. itm_3kXODDF42QXtnL',
			}, 'product_id'),
			dateQueryOption({
				displayName: 'Updated After',
				name: 'updatedAfter',
				default: '',
			}, 'updated_at__gte'),
			dateQueryOption({
				displayName: 'Updated Before',
				name: 'updatedBefore',
				default: '',
			}, 'updated_at__lte'),
		],
	},

	// Get Many for Customer
	...paginationProperties(show(['getAllForCustomer']), 'offset'),

	// Get Transactions
	...paginationProperties(
		show(['getTransactions']),
		'offset',
		customerCreditTransactionsQueryParameters,
	),
	{
		displayName: 'Filters',
		name: 'transactionFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getTransactions']),
		options: [
			queryOption({
				displayName: 'Invoice ID',
				name: 'invoiceId',
				type: 'string',
				default: '',
			}, 'invoice_id'),
			queryOption({
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Expiration', value: 'expiration' },
					{ name: 'Top-Up', value: 'topup' },
					{ name: 'Usage', value: 'usage' },
				],
				default: 'topup',
			}),
		],
	},
];
