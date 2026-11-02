import type { INodeProperties } from 'n8n-workflow';
import { bodyOption, recordLocator } from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { dateBodyOption, dateQueryOption } from '../../shared/dates';

const RESOURCE = 'customerFeature';

const show = (operations: string[], extra: Record<string, string[]> = {}) => ({
	show: { resource: [RESOURCE], operation: operations, ...extra },
});

const FEATURE_URL =
	'=/v1/customers/{{$parameter.customer}}/features/{{encodeURIComponent($parameter.featureCode)}}';

export const customerFeatureDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a customer feature',
				description: 'Remove a feature override from a customer',
				method: 'DELETE',
				url: FEATURE_URL,
				output: 'success',
			}),
			operation({
				name: 'Resolve',
				value: 'resolve',
				action: 'Resolve the features of a customer',
				description: 'Get the feature values a customer is entitled to, overrides included',
				method: 'GET',
				url: '=/v1/customers/{{$parameter.customer}}/features',
				output: 'list',
			}),
			operation({
				name: 'Set',
				value: 'set',
				action: 'Set a customer feature',
				description: 'Override the value of a feature for a customer',
				method: 'PUT',
				url: FEATURE_URL,
			}),
		],
		'resolve',
	),
	recordLocator({
		name: 'customer',
		displayName: 'Customer',
		searchListMethod: 'getCustomers',
		searchable: true,
		idPrefix: 'cus_',
		displayOptions: show(['delete', 'resolve', 'set']),
	}),
	{
		displayName: 'Feature Code',
		name: 'featureCode',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. max_seats',
		description: 'Code of the feature in the Hyperline catalog',
		displayOptions: show(['delete', 'set']),
	},

	// Set
	{
		displayName: 'Value Type',
		name: 'valueType',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Boolean',
				value: 'boolean',
				description: 'Turn the feature on or off',
			},
			{
				name: 'Number',
				value: 'number',
				description: 'Set a numeric limit, such as a quota',
			},
			{
				name: 'Unlimited',
				value: 'unlimited',
				description: 'Remove the limit of a numeric feature',
				routing: { send: { type: 'body', property: 'value', value: 'unlimited' } },
			},
		],
		default: 'boolean',
		description: 'Kind of value the feature takes',
		displayOptions: show(['set']),
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		required: true,
		default: true,
		description: 'Whether the feature is enabled for the customer',
		displayOptions: show(['set'], { valueType: ['boolean'] }),
		routing: { send: { type: 'body', property: 'value' } },
	},
	{
		displayName: 'Value',
		name: 'numberValue',
		type: 'number',
		required: true,
		default: 0,
		description: 'Numeric value of the feature for the customer',
		displayOptions: show(['set'], { valueType: ['number'] }),
		routing: { send: { type: 'body', property: 'value' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['set']),
		options: [
			dateBodyOption({
				displayName: 'Expires At',
				name: 'expiresAt',
				default: '',
				description: 'When the override ends. Leave unset to keep it until it is deleted.',
			}, 'expires_at'),
			bodyOption({
				displayName: 'Reason',
				name: 'reason',
				type: 'string',
				default: '',
				description: 'Why the override was granted, for your team',
			}),
		],
	},

	// Resolve
	{
		displayName: 'Options',
		name: 'resolveOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['resolve']),
		options: [
			dateQueryOption({
				displayName: 'Resolve At',
				name: 'at',
				default: '',
				description: 'Date to resolve the feature values at. Defaults to now.',
			}),
		],
	},
];
