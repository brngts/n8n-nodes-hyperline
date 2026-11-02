import type { INodeProperties } from 'n8n-workflow';
import { idParameter, paginationProperties, recordLocator } from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'productFeature';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const FEATURE_URL =
	'=/v1/products/{{$parameter.product}}/features/{{ encodeURIComponent($parameter.featureCode) }}';

export const productFeatureDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a product feature',
				description: 'Remove a feature value from a product',
				method: 'DELETE',
				url: FEATURE_URL,
				output: 'success',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many product features',
				description: 'List the feature values assigned to a product',
				method: 'GET',
				url: '=/v1/products/{{$parameter.product}}/features',
				output: 'list',
			}),
			operation({
				name: 'Set',
				value: 'set',
				action: 'Set a product feature',
				description: 'Set the value a product grants for a feature',
				method: 'PUT',
				url: FEATURE_URL,
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
		displayOptions: show(['delete', 'getAll', 'set']),
	}),
	idParameter({
		name: 'featureCode',
		displayName: 'Feature Code',
		placeholder: 'e.g. api_access',
		description: 'Code of the feature definition',
		displayOptions: show(['delete', 'set']),
	}),

	// Set
	{
		displayName: 'Value Type',
		name: 'valueType',
		type: 'options',
		required: true,
		options: [
			{ name: 'Boolean', value: 'boolean', description: 'Turn the feature on or off' },
			{ name: 'Number', value: 'number', description: 'Grant a numeric limit' },
			{ name: 'Unlimited', value: 'unlimited', description: 'Grant the feature without a limit' },
		],
		default: 'boolean',
		description: 'Must match the value type of the feature definition',
		displayOptions: show(['set']),
		routing: {
			send: {
				type: 'body',
				property: 'value',
				value:
					'={{ $value === "unlimited" ? "unlimited" : $value === "number" ? $parameter.numberValue : $parameter.booleanValue }}',
			},
		},
	},
	{
		displayName: 'Enabled',
		name: 'booleanValue',
		type: 'boolean',
		default: true,
		description: 'Whether the product grants the feature',
		displayOptions: { show: { resource: [RESOURCE], operation: ['set'], valueType: ['boolean'] } },
	},
	{
		displayName: 'Value',
		name: 'numberValue',
		type: 'number',
		default: 0,
		description: 'Numeric limit the product grants, such as a number of projects',
		displayOptions: { show: { resource: [RESOURCE], operation: ['set'], valueType: ['number'] } },
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'none'),
];
