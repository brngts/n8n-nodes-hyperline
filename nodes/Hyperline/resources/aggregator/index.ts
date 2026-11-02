import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	byDisplayName,
	idParameter,
	jsonBodyProperty,
	paginationProperties,
	queryOption,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { UTC_DATE_TIME_VALUE } from './dates';

const RESOURCE = 'aggregator';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const USAGE_PERIOD_OPERATIONS = ['getUsageByCustomer', 'getUsageEvents', 'getUsageTimeseries'];

/** Query parameters the paginated usage operations send, repeated on every page. */
const usageQueryParameters = ['start_date', 'end_date', 'aggregator_filter_id'];

const AGGREGATION_OPTIONS = [
	{ name: 'Count', value: 'count', description: 'Count the matching events' },
	{ name: 'Sum', value: 'sum', description: 'Add up a numeric property of the matching events' },
];

const JSON_BODY_PLACEHOLDER = `{
  "where": {
    "conditional": "and",
    "fields": [{ "property": "status", "operator": "equals", "value": "success" }]
  },
  "thresholds": [{ "name": "Soft limit", "comparison_operator": "gte", "threshold_value": 1000 }]
}`;

/** Optional fields shared by Create and Update. */
const sharedAggregatorFields: INodeProperties[] = [
	bodyOption({
		displayName: 'Aggregate on Customers',
		name: 'aggregateOnCustomersEnabled',
		type: 'boolean',
		default: false,
		description: 'Whether the aggregator aggregates on customers',
	}, 'aggregate_on_customers_enabled'),
	bodyOption({
		displayName: 'Allow Negative Values',
		name: 'allowNegativeValues',
		type: 'boolean',
		default: false,
		description: 'Whether the aggregator can produce negative values',
	}, 'allow_negative_values'),
	bodyOption({
		displayName: 'Custom Event Name',
		name: 'customEventName',
		type: 'string',
		default: '',
	}, 'custom_event_name'),
	bodyOption({
		displayName: 'Default Interval Count',
		name: 'defaultIntervalCount',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		description: 'Default number of periods in a usage interval',
	}, 'default_interval_count'),
	bodyOption({
		displayName: 'Default Interval Period',
		name: 'defaultIntervalPeriod',
		type: 'options',
		options: [
			{ name: 'Days', value: 'days' },
			{ name: 'Months', value: 'months' },
			{ name: 'Weeks', value: 'weeks' },
			{ name: 'Years', value: 'years' },
		],
		default: 'months',
		description: 'Default period unit of a usage interval',
	}, 'default_interval_period'),
	bodyOption({
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
	}),
	{
		displayName: 'Exposed Event Keys',
		name: 'exposedEventKeys',
		type: 'string',
		default: '',
		placeholder: 'e.g. region, plan',
		description: 'Comma-separated event record keys the aggregator exposes',
		routing: {
			send: {
				type: 'body',
				property: 'exposed_event_keys',
				value: '={{ $value.split(",").map((key) => key.trim()).filter((key) => key !== "") }}',
			},
		},
	},
	bodyOption({
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
	}),
	bodyOption({
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{ name: 'Licensed', value: 'licensed' },
			{ name: 'Metered', value: 'metered' },
		],
		default: 'metered',
	}),
	bodyOption({
		displayName: 'Unit Name',
		name: 'unitName',
		type: 'string',
		default: '',
		placeholder: 'e.g. request',
		description:
			'Display name of the unit being measured. Used as a fallback by products attached to this aggregator.',
	}, 'unit_name'),
];

export const aggregatorDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create an aggregator',
				description: 'Create an aggregator that counts or sums billable events',
				method: 'POST',
				url: '/v1/aggregators',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete an aggregator',
				description: 'Delete an aggregator that is not linked to a product',
				method: 'DELETE',
				url: '=/v1/aggregators/{{$parameter.aggregatorId}}',
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get an aggregator',
				description: 'Get an aggregator by ID',
				method: 'GET',
				url: '=/v1/aggregators/{{$parameter.aggregatorId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many aggregators',
				description: 'List the aggregators that compute usage from billable events',
				method: 'GET',
				url: '/v1/aggregators',
				output: 'list',
			}),
			operation({
				name: 'Get Usage',
				value: 'getUsage',
				action: 'Get usage of an aggregator',
				description: 'Get the usage row of an aggregator',
				method: 'GET',
				url: '=/v1/aggregators/{{$parameter.aggregatorId}}/usage',
			}),
			operation({
				name: 'Get Usage by Customer',
				value: 'getUsageByCustomer',
				action: 'Get usage by customer of an aggregator',
				description: 'Get the total usage of each customer over a period, ranked by total',
				method: 'GET',
				url: '=/v1/aggregators/{{$parameter.aggregatorId}}/usage/group-by-customer',
				output: 'list',
			}),
			operation({
				name: 'Get Usage Events',
				value: 'getUsageEvents',
				action: 'Get usage events of an aggregator',
				description: 'List the raw billable events of an aggregator across all customers',
				method: 'GET',
				url: '=/v1/aggregators/{{$parameter.aggregatorId}}/usage/events',
				output: 'list',
			}),
			operation({
				name: 'Get Usage Timeseries',
				value: 'getUsageTimeseries',
				action: 'Get usage timeseries of an aggregator',
				description: 'Get the account-wide usage of an aggregator bucketed by month, day or hour',
				method: 'GET',
				url: '=/v1/aggregators/{{$parameter.aggregatorId}}/usage/timeseries',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update an aggregator',
				description: 'Update the configuration of an aggregator',
				method: 'PUT',
				url: '=/v1/aggregators/{{$parameter.aggregatorId}}',
			}),
		],
		'get',
	),
	idParameter({
		name: 'aggregatorId',
		displayName: 'Aggregator ID',
		displayOptions: show(['delete', 'get', 'getUsage', 'update', ...USAGE_PERIOD_OPERATIONS]),
	}),

	// Create
	{
		displayName: 'Entity',
		name: 'entity',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. api_call',
		description: 'The billable event entity to aggregate, such as the event type of the billable events you send',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'entity' } },
	},
	{
		displayName: 'Aggregation',
		name: 'aggregationOperation',
		type: 'options',
		required: true,
		options: AGGREGATION_OPTIONS,
		default: 'count',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'operation' } },
	},
	{
		displayName: 'Property',
		name: 'property',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. duration',
		description: 'Numeric property of the event record to sum',
		displayOptions: { show: { resource: [RESOURCE], operation: ['create'], aggregationOperation: ['sum'] } },
		routing: { send: { type: 'body', property: 'property' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: sharedAggregatorFields,
	},
	jsonBodyProperty(
		show(['create']),
		'Filter conditions (where), thresholds and other aggregator fields from the Hyperline API reference. Fields set above take precedence.',
		JSON_BODY_PLACEHOLDER,
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
			...sharedAggregatorFields,
			bodyOption({
				displayName: 'Aggregation',
				name: 'aggregationOperation',
				type: 'options',
				options: AGGREGATION_OPTIONS,
				default: 'count',
			}, 'operation'),
			bodyOption({
				displayName: 'Entity',
				name: 'entity',
				type: 'string',
				default: '',
				description: 'The billable event entity to aggregate',
			}),
			bodyOption({
				displayName: 'Property',
				name: 'property',
				type: 'string',
				default: '',
				description: 'Numeric property of the event record to sum. Required when Aggregation is Sum.',
			}),
		].sort(byDisplayName),
	},
	jsonBodyProperty(
		show(['update']),
		'Filter conditions (where), thresholds and other aggregator fields from the Hyperline API reference. Thresholds replace the existing ones. Fields set above take precedence.',
		JSON_BODY_PLACEHOLDER,
	),

	// Usage over a period
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'Start of the usage period',
		displayOptions: show(USAGE_PERIOD_OPERATIONS),
		routing: { send: { type: 'query', property: 'start_date', value: UTC_DATE_TIME_VALUE } },
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'End of the usage period',
		displayOptions: show(USAGE_PERIOD_OPERATIONS),
		routing: { send: { type: 'query', property: 'end_date', value: UTC_DATE_TIME_VALUE } },
	},
	{
		displayName: 'Options',
		name: 'usageOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['getUsageByCustomer', 'getUsageEvents']),
		options: [
			queryOption({
				displayName: 'Aggregator Filter ID',
				name: 'aggregatorFilterId',
				type: 'string',
				default: '',
				description: 'Only count events matching this filter of the aggregator',
			}, 'aggregator_filter_id'),
		],
	},
	{
		displayName: 'Options',
		name: 'timeseriesOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['getUsageTimeseries']),
		options: [
			queryOption({
				displayName: 'Aggregator Filter ID',
				name: 'aggregatorFilterId',
				type: 'string',
				default: '',
				description: 'Only count events matching this filter of the aggregator',
			}, 'aggregator_filter_id'),
			queryOption({
				displayName: 'Group By',
				name: 'groupBy',
				type: 'options',
				options: [
					{ name: 'Day', value: 'day' },
					{ name: 'Hour', value: 'hour' },
					{ name: 'Month', value: 'month' },
				],
				default: 'day',
				description: 'Bucket size of the timeseries',
			}, 'group_by'),
		],
	},

	// Get Many, Get Usage by Customer and Get Usage Events
	...paginationProperties(
		show(['getAll', 'getUsageByCustomer', 'getUsageEvents']),
		'offset',
		usageQueryParameters,
	),
];
