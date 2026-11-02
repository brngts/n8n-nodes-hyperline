import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	byDisplayName,
	jsonBodyProperty,
	jsonParameter,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'product';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const productGetManyQueryParameters = ['status', 'name__contains', 'type', 'price_book_id'];

/** Optional fields shared by Create and Update. */
function sharedProductFields(): INodeProperties[] {
	return [
		bodyOption({
			displayName: 'Available for One-Off Invoices',
			name: 'isAvailableOnDemand',
			type: 'boolean',
			default: true,
			description: 'Whether the product can be added to one-off invoices',
		}, 'is_available_on_demand'),
		bodyOption({
			displayName: 'Available for Subscriptions',
			name: 'isAvailableOnSubscription',
			type: 'boolean',
			default: true,
			description: 'Whether the product can be added to subscriptions',
		}, 'is_available_on_subscription'),
		bodyOption({
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
			description: 'Internal description of the product',
		}),
		bodyOption({
			displayName: 'Public Description',
			name: 'publicDescription',
			type: 'string',
			typeOptions: { rows: 3 },
			default: '',
			description: 'Description shown to customers, up to 5000 characters',
		}, 'public_description'),
	];
}

const PRICE_CONFIGURATIONS_DEFAULT = `[
  {
    "currency": "EUR",
    "type": "fee",
    "billing_interval": { "period": "months", "count": 1 },
    "prices": [{ "type": "fee", "amount": 0 }]
  }
]`;

export const productDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Archive',
				value: 'archive',
				action: 'Archive a product',
				description: 'Archive a product so it cannot be added to new subscriptions',
				method: 'PUT',
				url: '=/v1/products/{{$parameter.product}}/archive',
				output: 'success',
			}),
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a product',
				description: 'Create a catalog product with its price configurations',
				method: 'POST',
				url: '/v1/products',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a product',
				description: 'Permanently delete an archived product that is not in use',
				method: 'DELETE',
				url: '=/v1/products/{{$parameter.product}}',
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a product',
				description: 'Get a catalog product and its price configurations',
				method: 'GET',
				url: '=/v1/products/{{$parameter.product}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many products',
				description: 'List catalog products',
				method: 'GET',
				url: '/v1/products',
				output: 'list',
			}),
			operation({
				name: 'Unarchive',
				value: 'unarchive',
				action: 'Unarchive a product',
				description: 'Restore an archived product so it can be added to new subscriptions',
				method: 'PUT',
				url: '=/v1/products/{{$parameter.product}}/unarchive',
				output: 'success',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a product',
				description: 'Update the name, descriptions and availability of a product',
				method: 'PUT',
				url: '=/v1/products/{{$parameter.product}}',
			}),
		],
		'getAll',
	),
	recordLocator({
		name: 'product',
		displayName: 'Product',
		searchListMethod: 'getProducts',
		searchable: true,
		idPrefix: 'itm_',
		displayOptions: show(['archive', 'delete', 'get', 'unarchive', 'update']),
	}),

	// Create and Update
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Product name, as shown on invoices',
		displayOptions: show(['create', 'update']),
		routing: { send: { type: 'body', property: 'name' } },
	},

	// Create
	{
		displayName: 'Type',
		name: 'productType',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Bundle',
				value: 'bundle',
				description: 'Groups several products, set through bundle_items',
			},
			{
				name: 'Credit',
				value: 'credit',
				description: 'Prepaid credits that usage draws down',
			},
			{
				name: 'Dynamic',
				value: 'dynamic',
				description: 'Usage-based product priced from billable events',
			},
			{
				name: 'Flat Fee',
				value: 'flat_fee',
				description: 'Fixed price per billing period or one-off',
			},
			{
				name: 'Seat',
				value: 'seat',
				description: 'Priced per seat or unit',
			},
		],
		default: 'flat_fee',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'type' } },
	},
	jsonParameter({
		displayName: 'Price Configurations (JSON)',
		name: 'priceConfigurations',
		property: 'price_configurations',
		shape: 'array',
		required: true,
		default: PRICE_CONFIGURATIONS_DEFAULT,
		description:
			'How the product is priced: one entry per currency, billing interval and pricing model. Amounts are in cents.',
		displayOptions: show(['create']),
	}),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			...sharedProductFields(),
			bodyOption({
				displayName: 'Aggregator ID',
				name: 'aggregatorId',
				type: 'string',
				default: '',
				description: 'Existing aggregator that meters this product, for dynamic, seat and credit products',
			}, 'aggregator_id'),
			bodyOption({
				displayName: 'Bundle Display Mode',
				name: 'displayMode',
				type: 'options',
				options: [
					{ name: 'Single Line', value: 'single_line' },
					{ name: 'Ventilated', value: 'ventilated' },
				],
				default: 'single_line',
				description: 'How bundle items are displayed on invoices',
			}, 'display_mode'),
			bodyOption({
				displayName: 'Connected Seat Item',
				name: 'isConnectedSeatItem',
				type: 'boolean',
				default: false,
				description: 'Whether the seat count is synced from an external source, such as CRM users',
			}, 'is_connected_seat_item'),
			bodyOption({
				displayName: 'Create Credit Balance Automatically',
				name: 'creditsBalanceAutoCreationEnabled',
				type: 'boolean',
				default: true,
				description:
					'Whether the customer credit balance is created as soon as this credit product is added to a subscription',
			}, 'credits_balance_auto_creation_enabled'),
			bodyOption({
				displayName: 'Credits Grant Mode',
				name: 'creditsGrantMode',
				type: 'options',
				options: [
					{
						name: 'Full Allowance',
						value: 'full_allowance',
						description: 'Always grant the full allowance. The invoice stays prorated.',
					},
					{
						name: 'Prorated',
						value: 'prorated',
						description: 'Prorate the granted credits to the elapsed period',
					},
				],
				default: 'prorated',
				description: 'How the periodic credit allowance is granted for partial billing periods',
			}, 'credits_grant_mode'),
			bodyOption({
				displayName: 'Exclusive Bundle Items',
				name: 'exclusiveItemsEnabled',
				type: 'boolean',
				default: false,
				description: 'Whether only one item of the bundle can be active at a time',
			}, 'exclusive_items_enabled'),
			bodyOption({
				displayName: 'Low Credits Threshold',
				name: 'lowCreditsThreshold',
				type: 'number',
				default: 0,
				description: 'Credit balance below which the balance counts as low',
			}, 'low_credits_threshold'),
			bodyOption({
				displayName: 'Show Interval Dates in Description',
				name: 'descriptionDisplayIntervalDates',
				type: 'boolean',
				default: false,
				description: 'Whether the dates of the billing interval are added to the product description on invoices',
			}, 'description_display_interval_dates'),
			bodyOption({
				displayName: 'Unit Name',
				name: 'unitName',
				type: 'string',
				default: '',
				placeholder: 'e.g. seat',
				description: 'Name of the unit being billed',
			}, 'unit_name'),
		].sort(byDisplayName),
	},
	jsonBodyProperty(
		show(['create']),
		'Other product fields from the Hyperline API reference, such as custom_properties, accounting, translations, aggregator, credit_aggregators or bundle_items. Fields set above take precedence.',
		'{\n  "bundle_items": [{ "product_id": "itm_...", "percentage": 100 }]\n}',
	),

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: sharedProductFields().sort(byDisplayName),
	},
	jsonBodyProperty(
		show(['update']),
		'Other product fields from the Hyperline API reference, such as custom_properties, properties, accounting or translations. Fields set above take precedence.',
		'{\n  "custom_properties": { "plan_family": "pro" }\n}',
	),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset', productGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'Name Contains',
				name: 'nameContains',
				type: 'string',
				default: '',
			}, 'name__contains'),
			queryOption({
				displayName: 'Price Book ID',
				name: 'priceBookId',
				type: 'string',
				default: '',
				description: 'Return prices from this price book instead of the default catalog',
			}, 'price_book_id'),
			queryOption({
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'All', value: 'all' },
					{ name: 'Archived', value: 'archived' },
				],
				default: 'active',
			}),
			queryOption({
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				placeholder: 'e.g. flat_fee',
				description: 'Product type, such as flat_fee, seat, dynamic or credit',
			}),
		],
	},
];
