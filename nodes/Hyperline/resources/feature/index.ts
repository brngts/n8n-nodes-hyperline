import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import {
	bodyOption,
	idParameter,
	paginationProperties,
	queryOption,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'feature';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const FEATURE_URL = '=/v1/features/{{ encodeURIComponent($parameter.featureCode) }}';

export const featureGetManyQueryParameters = ['code', 'name__contains', 'search', 'status'];

const VALUE_TYPE_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Boolean', value: 'boolean', description: 'The feature is on or off' },
	{ name: 'Number', value: 'number', description: 'The feature carries a numeric limit' },
];

const RESOLUTION_STRATEGY_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Max', value: 'max' },
	{ name: 'Replace', value: 'replace' },
	{ name: 'Sum', value: 'sum' },
];

const RESOLUTION_STRATEGY_DESCRIPTION =
	'How the values of several products are combined, for number features';

export const featureDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Archive',
				value: 'archive',
				action: 'Archive a feature',
				description: 'Archive a feature definition, which is required before deleting it',
				method: 'PUT',
				url: `${FEATURE_URL}/archive`,
				output: 'success',
			}),
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a feature',
				description: 'Create a feature definition that products and customers can grant',
				method: 'POST',
				url: '/v1/features',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a feature',
				description: 'Permanently delete an archived feature definition that is not in use',
				method: 'DELETE',
				url: FEATURE_URL,
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a feature',
				description: 'Get a feature definition by code',
				method: 'GET',
				url: FEATURE_URL,
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many features',
				description: 'List feature definitions',
				method: 'GET',
				url: '/v1/features',
				output: 'list',
			}),
			operation({
				name: 'Unarchive',
				value: 'unarchive',
				action: 'Unarchive a feature',
				description: 'Restore an archived feature definition',
				method: 'PUT',
				url: `${FEATURE_URL}/unarchive`,
				output: 'success',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a feature',
				description: 'Update a feature definition. Only the fields you set are changed.',
				method: 'PUT',
				url: FEATURE_URL,
			}),
		],
		'get',
	),
	idParameter({
		name: 'featureCode',
		displayName: 'Feature Code',
		placeholder: 'e.g. api_access',
		displayOptions: show(['archive', 'delete', 'get', 'unarchive', 'update']),
	}),

	// Create
	{
		displayName: 'Code',
		name: 'code',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. api_access',
		description: 'Unique code of the feature, up to 100 characters',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'code' } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Value Type',
		name: 'valueType',
		type: 'options',
		required: true,
		options: VALUE_TYPE_OPTIONS,
		default: 'boolean',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'value_type' } },
	},
	{
		displayName: 'Default Value',
		name: 'defaultBooleanValue',
		type: 'boolean',
		default: false,
		description: 'Whether the feature is on when no product or customer value applies',
		displayOptions: { show: { resource: [RESOURCE], operation: ['create'], valueType: ['boolean'] } },
		routing: { send: { type: 'body', property: 'default_value' } },
	},
	{
		displayName: 'Default Value',
		name: 'defaultNumberValue',
		type: 'number',
		default: 0,
		description: 'Value used when no product or customer value applies',
		displayOptions: { show: { resource: [RESOURCE], operation: ['create'], valueType: ['number'] } },
		routing: { send: { type: 'body', property: 'default_value' } },
	},
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
			bodyOption({
				displayName: 'Resolution Strategy',
				name: 'resolutionStrategy',
				type: 'options',
				options: RESOLUTION_STRATEGY_OPTIONS,
				default: 'max',
				description: RESOLUTION_STRATEGY_DESCRIPTION,
			}, 'resolution_strategy'),
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
				displayName: 'Default Boolean Value',
				name: 'defaultBooleanValue',
				type: 'boolean',
				default: false,
				description:
					'Whether a boolean feature is on when no product or customer value applies',
			}, 'default_value'),
			bodyOption({
				displayName: 'Default Number Value',
				name: 'defaultNumberValue',
				type: 'number',
				default: 0,
				description: 'Value of a number feature when no product or customer value applies',
			}, 'default_value'),
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
			bodyOption({
				displayName: 'Resolution Strategy',
				name: 'resolutionStrategy',
				type: 'options',
				options: RESOLUTION_STRATEGY_OPTIONS,
				default: 'max',
				description: RESOLUTION_STRATEGY_DESCRIPTION,
			}, 'resolution_strategy'),
			bodyOption({
				displayName: 'Value Type',
				name: 'valueType',
				type: 'options',
				options: VALUE_TYPE_OPTIONS,
				default: 'boolean',
			}, 'value_type'),
		],
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'offset', featureGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'Code',
				name: 'code',
				type: 'string',
				default: '',
				description: 'Exact feature code',
			}),
			queryOption({
				displayName: 'Name Contains',
				name: 'nameContains',
				type: 'string',
				default: '',
			}, 'name__contains'),
			queryOption({
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Free-text search across feature definitions',
			}),
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
		],
	},
];
