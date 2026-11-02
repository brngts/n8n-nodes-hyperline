import type { INodeProperties } from 'n8n-workflow';
import {
	idParameter,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { dateQueryOption } from '../../shared/dates';

const RESOURCE = 'customerUsage';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const AGGREGATOR_USAGE_URL =
	'=/v1/customers/{{$parameter.customer}}/usage/{{$parameter.aggregatorId}}';

const customerUsageEventsQueryParameters = ['start_date', 'end_date', 'aggregator_filter_id'];

const aggregatorFilterOption = queryOption({
	displayName: 'Aggregator Filter ID',
	name: 'aggregatorFilterId',
	type: 'string',
	default: '',
	description: 'Only count events that match this filter of the aggregator',
}, 'aggregator_filter_id');

export const customerUsageDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get the usage of a customer for an aggregator',
				description: 'Get the usage of a customer for one aggregator over a period',
				method: 'GET',
				url: AGGREGATOR_USAGE_URL,
			}),
			operation({
				name: 'Get Events',
				value: 'getEvents',
				action: 'Get the usage events of a customer',
				description: 'List the raw billable events of a customer for one aggregator over a period',
				method: 'GET',
				url: `${AGGREGATOR_USAGE_URL}/events`,
				output: 'list',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get the usage of a customer per aggregator',
				description: 'List the usage total and event count of a customer for each aggregator over a period',
				method: 'GET',
				url: '=/v1/customers/{{$parameter.customer}}/usage',
				output: 'list',
			}),
			operation({
				name: 'Get Timeseries',
				value: 'getTimeseries',
				action: 'Get the usage timeseries of a customer',
				description: 'Get the usage of a customer for one aggregator per month, day or hour',
				method: 'GET',
				url: `${AGGREGATOR_USAGE_URL}/timeseries`,
			}),
		],
		'getAll',
	),
	recordLocator({
		name: 'customer',
		displayName: 'Customer',
		searchListMethod: 'getCustomers',
		searchable: true,
		idPrefix: 'cus_',
		displayOptions: show(['get', 'getAll', 'getEvents', 'getTimeseries']),
	}),
	idParameter({
		name: 'aggregatorId',
		displayName: 'Aggregator ID',
		description: 'The aggregator that measures the usage',
		displayOptions: show(['get', 'getEvents', 'getTimeseries']),
	}),
	dateQueryOption({
		displayName: 'Start Date',
		name: 'startDate',
		required: true,
		default: '={{ $now.startOf("month").toISO() }}',
		description: 'Start of the period',
		displayOptions: show(['get', 'getAll', 'getEvents', 'getTimeseries']),
	}, 'start_date'),
	dateQueryOption({
		displayName: 'End Date',
		name: 'endDate',
		required: true,
		default: '={{ $now.toISO() }}',
		description: 'End of the period',
		displayOptions: show(['get', 'getAll', 'getEvents', 'getTimeseries']),
	}, 'end_date'),

	// Get Timeseries
	{
		displayName: 'Options',
		name: 'timeseriesOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['getTimeseries']),
		options: [
			aggregatorFilterOption,
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

	// Get Events
	...paginationProperties(show(['getEvents']), 'offset', customerUsageEventsQueryParameters),
	{
		displayName: 'Options',
		name: 'eventsOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['getEvents']),
		options: [aggregatorFilterOption],
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'none'),
];
