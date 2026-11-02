import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	idParameter,
	jsonArrayBodyParameter,
	jsonBodyProperty,
	jsonParameter,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'priceConfiguration';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const priceConfigurationGetManyQueryParameters = [
	'product_id',
	'price_book_id',
	'price_book_id__isNull',
];

const PRICES_DESCRIPTION =
	'Price tiers, each with the same type as the pricing model. A fixed fee has a single price. Amounts are in cents.';

const CREATE_PRICES_DEFAULT = '[\n  { "type": "fee", "amount": 0 }\n]';

export const priceConfigurationDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a price configuration',
				description: 'Add a price configuration to an existing product',
				method: 'POST',
				url: '/v1/price-configurations',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a price configuration',
				description: 'Delete a price configuration, which removes the pricing option from its product',
				method: 'DELETE',
				url: '=/v1/price-configurations/{{$parameter.priceConfigurationId}}',
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a price configuration',
				description: 'Get a price configuration with its prices',
				method: 'GET',
				url: '=/v1/price-configurations/{{$parameter.priceConfigurationId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many price configurations',
				description: 'List price configurations',
				method: 'GET',
				url: '/v1/price-configurations',
				output: 'list',
			}),
			operation({
				name: 'Update Prices',
				value: 'updatePrices',
				action: 'Update the prices of a price configuration',
				description: 'Change the tiers, unit prices or flat fees of a price configuration',
				method: 'PUT',
				url: '=/v1/price-configurations/{{$parameter.priceConfigurationId}}/prices',
			}),
		],
		'get',
	),
	idParameter({
		name: 'priceConfigurationId',
		displayName: 'Price Configuration ID',
		displayOptions: show(['delete', 'get', 'updatePrices']),
	}),

	// Create
	{
		...recordLocator({
			name: 'product',
			displayName: 'Product',
			searchListMethod: 'getProducts',
			searchable: true,
			idPrefix: 'itm_',
			description: 'The product to add the price configuration to',
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
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. EUR',
		description: 'Three-letter ISO currency code',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'currency' } },
	},
	{
		displayName: 'Pricing Model',
		name: 'pricingModel',
		type: 'options',
		required: true,
		options: [
			{ name: 'Basis Points', value: 'bps' },
			{ name: 'Bulk', value: 'bulk' },
			{ name: 'Bundle', value: 'bundle' },
			{ name: 'Fixed Fee', value: 'fee' },
			{ name: 'Packaged', value: 'packaged' },
			{ name: 'Volume', value: 'volume' },
		],
		default: 'fee',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'type' } },
	},
	{
		displayName: 'Billing Period',
		name: 'billingPeriod',
		type: 'options',
		required: true,
		options: [
			{ name: 'Days', value: 'days' },
			{ name: 'Months', value: 'months' },
			{ name: 'Once', value: 'once', description: 'Billed a single time' },
			{ name: 'Weeks', value: 'weeks' },
			{ name: 'Years', value: 'years' },
		],
		default: 'months',
		description: 'Billing interval the price configuration applies to',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'billing_interval.period' } },
	},
	{
		displayName: 'Billing Period Count',
		name: 'billingPeriodCount',
		type: 'number',
		required: true,
		default: 1,
		typeOptions: { minValue: 1 },
		description: 'Number of periods per billing interval, for example 3 with Months for quarterly billing',
		displayOptions: {
			show: { resource: [RESOURCE], operation: ['create'] },
			hide: { billingPeriod: ['once'] },
		},
		routing: { send: { type: 'body', property: 'billing_interval.count' } },
	},
	jsonParameter({
		displayName: 'Prices (JSON)',
		name: 'prices',
		property: 'prices',
		shape: 'array',
		required: true,
		default: CREATE_PRICES_DEFAULT,
		description: PRICES_DESCRIPTION,
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
			bodyOption({
				displayName: 'Aggregator Filter ID',
				name: 'aggregatorFilterId',
				type: 'string',
				default: '',
				description:
					'Existing metering filter of the product aggregator to attach, instead of a new metering_filter',
			}, 'aggregator_filter_id'),
			bodyOption({
				displayName: 'Allow on Portal',
				name: 'allowOnPortal',
				type: 'boolean',
				default: false,
				description: 'Whether customers can choose this price configuration in the customer portal',
			}, 'allow_on_portal'),
			bodyOption({
				displayName: 'Commitment Period',
				name: 'commitmentPeriod',
				type: 'options',
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'Months', value: 'months' },
					{ name: 'Weeks', value: 'weeks' },
					{ name: 'Years', value: 'years' },
				],
				default: 'years',
				description: 'Commitment interval the price configuration applies to',
			}, 'commitment_interval.period'),
			bodyOption({
				displayName: 'Commitment Period Count',
				name: 'commitmentPeriodCount',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 1 },
				description: 'Number of commitment periods. Not used when Commitment Period is All.',
			}, 'commitment_interval.count'),
			{
				displayName: 'Countries',
				name: 'countries',
				type: 'string',
				default: '',
				placeholder: 'e.g. DE, FR',
				description:
					'Comma-separated two-letter ISO country codes the price configuration is limited to. Leave unset for every country.',
				routing: {
					send: {
						type: 'body',
						property: 'countries',
						value:
							'={{ $value === "" ? undefined : $value.split(",").map((code) => code.trim().toUpperCase()).filter((code) => code !== "") }}',
					},
				},
			},
			bodyOption({
				displayName: 'Price Book ID',
				name: 'priceBookId',
				type: 'string',
				default: '',
				description: 'Price book the configuration belongs to. Leave unset for the default price book.',
			}, 'price_book_id'),
		],
	},
	jsonBodyProperty(
		show(['create']),
		'Other price configuration fields from the Hyperline API reference, such as metering_filter for dynamic products. Fields set above take precedence.',
		'{\n  "metering_filter": {\n    "name": "EU traffic",\n    "configuration": {\n      "conditional": "and",\n      "fields": [{ "property": "region", "operator": "equals", "value": "eu" }]\n    }\n  }\n}',
	),

	// Update Prices
	jsonArrayBodyParameter({
		displayName: 'Prices (JSON)',
		name: 'prices',
		description:
			'Full list of price tiers. Each has a type, an amount in cents and, for tiered models, from and to quantities.',
		placeholder: '[\n  { "type": "volume", "from": 0, "to": 100, "amount": 1000 }\n]',
		displayOptions: show(['updatePrices']),
	}),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset', priceConfigurationGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'In Default Price Book',
				name: 'inDefaultPriceBook',
				type: 'boolean',
				default: true,
				description:
					'Whether to return only price configurations of the default price book, or only those of other price books when off',
			}, 'price_book_id__isNull'),
			queryOption({
				displayName: 'Price Book ID',
				name: 'priceBookId',
				type: 'string',
				default: '',
			}, 'price_book_id'),
			queryOption({
				displayName: 'Product ID',
				name: 'productId',
				type: 'string',
				default: '',
				placeholder: 'e.g. itm_3kXODDF42QXtnL',
			}, 'product_id'),
		],
	},
];
