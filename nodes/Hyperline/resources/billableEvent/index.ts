import type { INodeProperties } from 'n8n-workflow';
import { INGEST_BASE_URL } from '../../shared/constants';
import { operation, operationSelector } from '../../shared/operations';
import { setJsonBodyProperty } from '../../shared/preSend';

const RESOURCE = 'billableEvent';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const billableEventDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Send',
				value: 'send',
				action: 'Send a usage event',
				description: 'Send a usage event that Hyperline meters for usage-based billing',
				method: 'POST',
				url: '/v1/events',
				output: 'success',
				request: { baseURL: INGEST_BASE_URL },
			}),
		],
		'send',
	),
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
		routing: { send: { type: 'body', property: 'timestamp' } },
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
];
