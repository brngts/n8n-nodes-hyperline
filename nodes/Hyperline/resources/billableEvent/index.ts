import type { INodeProperties } from 'n8n-workflow';
import {
	LIST_VALUE,
	jsonArrayBodyParameter,
	jsonParameter,
	paginationProperties,
	queryOption,
} from '../../shared/descriptions';
import { INGEST_BASE_URL } from '../../shared/constants';
import { operation, operationSelector } from '../../shared/operations';
import { setJsonBodyProperty } from '../../shared/preSend';
import { UTC_DATE_TIME_VALUE } from '../../shared/dates';

const RESOURCE = 'billableEvent';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

/** Every `/v1/events` endpoint lives on the ingestion host. */
const INGEST_REQUEST = { baseURL: INGEST_BASE_URL };

const billableEventGetManyQueryParameters = [
	'event_type',
	'customer_id',
	'record_id__in',
	'record',
	'timestamp_gte',
	'timestamp_lte',
	'sort',
	'order',
];

const BATCH_DEFAULT = `[
  {
    "customer_id": "",
    "event_type": "",
    "timestamp": "",
    "record": { "id": "" }
  }
]`;

export const billableEventDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete billable events',
				description: 'Delete the billable events of a type, optionally narrowed by customer or record',
				method: 'DELETE',
				url: '/v1/events',
				output: 'success',
				request: INGEST_REQUEST,
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many billable events',
				description: 'List the billable events of a type',
				method: 'GET',
				url: '/v1/events',
				output: 'list',
				request: INGEST_REQUEST,
			}),
			operation({
				name: 'Send',
				value: 'send',
				action: 'Send a billable event',
				description: 'Send a billable event that Hyperline meters for usage-based billing',
				method: 'POST',
				url: '/v1/events',
				output: 'success',
				request: INGEST_REQUEST,
			}),
			operation({
				name: 'Send Batch',
				value: 'sendBatch',
				action: 'Send a batch of billable events',
				description: 'Send up to 5,000 billable events of the same type in one request',
				method: 'POST',
				url: '/v1/events/batch',
				output: 'success',
				request: INGEST_REQUEST,
			}),
		],
		'send',
	),

	// Send
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. cus_DKL4Xcb5VSa8CQ',
		description: 'Hyperline ID or external ID of an existing customer',
		displayOptions: show(['send']),
		routing: { send: { type: 'body', property: 'customer_id' } },
	},
	{
		displayName: 'Event Type',
		name: 'eventType',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. workflow_execution',
		description: 'The type your aggregators and usage products listen to',
		displayOptions: show(['send']),
		routing: { send: { type: 'body', property: 'event_type' } },
	},
	{
		displayName: 'Timestamp',
		name: 'timestamp',
		type: 'dateTime',
		required: true,
		default: '={{ $now.toISO() }}',
		description: 'When the usage happened',
		displayOptions: show(['send']),
		routing: { send: { type: 'body', property: 'timestamp', value: UTC_DATE_TIME_VALUE } },
	},
	{
		displayName: 'Record (JSON)',
		name: 'record',
		type: 'json',
		required: true,
		default: '{\n  "id": ""\n}',
		description:
			'Event payload. Give every event a unique ID so Hyperline can deduplicate it, and add any properties your aggregators use.',
		displayOptions: show(['send']),
		routing: { send: { preSend: [setJsonBodyProperty('record', 'record', 'Record (JSON)')] } },
	},

	// Send Batch
	jsonArrayBodyParameter({
		displayName: 'Events (JSON)',
		name: 'events',
		default: BATCH_DEFAULT,
		description:
			'Up to 5,000 events of the same type, each with customer_id, event_type, timestamp and a record with a unique ID. Events with an existing record ID are updated.',
		displayOptions: show(['sendBatch']),
	}),

	// Delete
	{
		displayName: 'Event Type',
		name: 'eventType',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. workflow_execution',
		description: 'Type of the events to delete',
		displayOptions: show(['delete']),
		routing: { send: { type: 'body', property: 'event_type' } },
	},
	jsonParameter({
		displayName: 'Matching (JSON)',
		name: 'matching',
		property: 'matching',
		default: '',
		description:
			'Conditions on the event record that the events to delete must match. Leave empty to match every event of the type.',
		placeholder: '{\n  "case_id": "cas_123"\n}',
		displayOptions: show(['delete']),
	}),
	{
		displayName: 'Options',
		name: 'deleteOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['delete']),
		options: [
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				placeholder: 'e.g. cus_DKL4Xcb5VSa8CQ',
				description: 'Only delete the events of this customer',
				routing: { send: { type: 'body', property: 'customer_id' } },
			},
			{
				displayName: 'Record IDs',
				name: 'recordIds',
				type: 'string',
				default: '',
				placeholder: 'e.g. evt-001, evt-002',
				description: 'Comma-separated record IDs of the events to delete',
				routing: {
					send: {
						type: 'body',
						property: 'record_ids',
						value: LIST_VALUE,
					},
				},
			},
		],
	},

	// Get Many
	{
		displayName: 'Event Type',
		name: 'eventType',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. workflow_execution',
		description: 'Type of the events to return',
		displayOptions: show(['getAll']),
		routing: { send: { type: 'query', property: 'event_type' } },
	},
	...paginationProperties(show(['getAll']), 'offset', billableEventGetManyQueryParameters),
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
				displayName: 'Record IDs',
				name: 'recordIds',
				type: 'string',
				default: '',
				placeholder: 'e.g. evt-001, evt-002',
				description: 'Comma-separated record IDs',
			}, 'record_id__in'),
			{
				displayName: 'Record Properties',
				name: 'recordProperties',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Property',
				default: {},
				description:
					'Only return events whose record has these values, compared as text. Append __in to a name to match a comma-separated list. Up to 5 properties.',
				options: [
					{
						displayName: 'Property',
						name: 'property',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'e.g. case_id',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
				routing: {
					send: {
						type: 'query',
						property: 'record',
						value:
							'={{ Object.fromEntries(($value.property ?? []).filter((entry) => entry.name).map((entry) => [entry.name, entry.value])) }}',
					},
				},
			},
			{
				displayName: 'Timestamp After',
				name: 'timestampGte',
				type: 'dateTime',
				default: '',
				description: 'Only return events at or after this time',
				routing: { send: { type: 'query', property: 'timestamp_gte', value: UTC_DATE_TIME_VALUE } },
			},
			{
				displayName: 'Timestamp Before',
				name: 'timestampLte',
				type: 'dateTime',
				default: '',
				description: 'Only return events at or before this time',
				routing: { send: { type: 'query', property: 'timestamp_lte', value: UTC_DATE_TIME_VALUE } },
			},
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
				options: [{ name: 'Timestamp', value: 'timestamp' }],
				default: 'timestamp',
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
