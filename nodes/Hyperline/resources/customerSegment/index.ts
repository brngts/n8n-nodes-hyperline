import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	idParameter,
	jsonParameter,
	paginationProperties,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { setJsonBodyProperty } from '../../shared/preSend';

const RESOURCE = 'customerSegment';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const SEGMENT_URL = '=/v1/customers/segments/{{$parameter.segmentId}}';

const RULES_DESCRIPTION =
	'Rule groups as a JSON array. Each group has an operator (and, or) and conditions with a field (such as country, currency, subscription_status or custom_property.<slug>), an operator (such as in, not_in, set, not_set) and a value list.';

const UPDATE_RULES_DESCRIPTION = `${RULES_DESCRIPTION} Replaces the current rules.`;

const RULES_PLACEHOLDER = `[
  {
    "operator": "and",
    "conditions": [
      { "field": "country", "operator": "in", "value": ["FR", "DE"] },
      { "field": "subscription_status", "operator": "in", "value": ["active"] }
    ]
  }
]`;

export const customerSegmentDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a customer segment',
				description: 'Create a customer segment from rules on customer fields',
				method: 'POST',
				url: '/v1/customers/segments',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a customer segment',
				description: 'Permanently delete a customer segment',
				method: 'DELETE',
				url: SEGMENT_URL,
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a customer segment',
				description: 'Get a customer segment and its rules',
				method: 'GET',
				url: SEGMENT_URL,
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many customer segments',
				description: 'List customer segments',
				method: 'GET',
				url: '/v1/customers/segments',
				output: 'list',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a customer segment',
				description: 'Update the name, description or rules of a customer segment',
				method: 'PATCH',
				url: SEGMENT_URL,
			}),
		],
		'getAll',
	),
	idParameter({
		name: 'segmentId',
		displayName: 'Segment ID',
		displayOptions: show(['delete', 'get', 'update']),
	}),

	// Create
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'name' } },
	},
	jsonParameter({
		displayName: 'Rules (JSON)',
		name: 'rules',
		property: 'rules',
		shape: 'array',
		required: true,
		description: RULES_DESCRIPTION,
		placeholder: RULES_PLACEHOLDER,
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
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			}),
		],
	},

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			bodyOption({
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			}),
			bodyOption({
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			}),
			{
				displayName: 'Rules (JSON)',
				name: 'rules',
				type: 'json',
				default: '[]',
				description: UPDATE_RULES_DESCRIPTION,
				placeholder: RULES_PLACEHOLDER,
				routing: {
					send: {
						preSend: [setJsonBodyProperty('updateFields.rules', 'rules', 'Rules (JSON)', 'array')],
					},
				},
			},
		],
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'offset'),
];
