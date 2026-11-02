import type { INodeProperties } from 'n8n-workflow';
import {
	LIST_VALUE,
	bodyOption,
	idParameter,
	jsonBodyProperty,
	paginationProperties,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'customProperty';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

/** Create and Update take the same body: Hyperline replaces the definition on update. */
function customPropertyFields(forOperation: 'create' | 'update'): INodeProperties[] {
	const showFor = () => ({ show: { resource: [RESOURCE], operation: [forOperation] } });
	return [
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. Cost Center',
			displayOptions: showFor(),
			routing: { send: { type: 'body', property: 'name' } },
		},
		{
			displayName: 'Slug',
			name: 'slug',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. cost_center',
			description: 'Key the value is stored under in the custom_properties of a record',
			displayOptions: showFor(),
			routing: { send: { type: 'body', property: 'slug' } },
		},
		{
			displayName: 'Type',
			name: 'type',
			type: 'options',
			required: true,
			options: [
				{ name: 'Boolean', value: 'boolean' },
				{ name: 'Date', value: 'date' },
				{ name: 'Email', value: 'email' },
				{ name: 'Multi Select', value: 'multi_select' },
				{ name: 'Number', value: 'number' },
				{ name: 'Select', value: 'select' },
				{ name: 'Text', value: 'text' },
			],
			default: 'text',
			displayOptions: showFor(),
			routing: { send: { type: 'body', property: 'type' } },
		},
		{
			displayName: 'Entities',
			name: 'entities',
			type: 'multiOptions',
			required: true,
			options: [
				{ name: 'Customer', value: 'customer' },
				{ name: 'Invoice', value: 'invoice' },
				{ name: 'Plan', value: 'plan' },
				{ name: 'Product', value: 'product' },
				{ name: 'Quote', value: 'quote' },
				{ name: 'Subscription', value: 'subscription' },
			],
			default: [],
			description: 'Records the custom property can be set on',
			displayOptions: showFor(),
			routing: { send: { type: 'body', property: 'entities' } },
		},
		{
			displayName: forOperation === 'create' ? 'Additional Fields' : 'Update Fields',
			name: forOperation === 'create' ? 'additionalFields' : 'updateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: showFor(),
			options: [
				bodyOption({
					displayName: 'API Only',
					name: 'apiOnly',
					type: 'boolean',
					default: false,
					description: 'Whether the value can only be set through the API, not in the Hyperline app',
				}, 'api_only'),
				{
					displayName: 'Authorized Values',
					name: 'authorizedValues',
					type: 'string',
					default: '',
					placeholder: 'e.g. standard, premium, enterprise',
					description: 'Comma-separated values to choose from, for the Select and Multi Select types',
					routing: {
						send: {
							type: 'body',
							property: 'authorized_values',
							value:
								LIST_VALUE,
						},
					},
				},
				bodyOption({
					displayName: 'Required',
					name: 'required',
					type: 'boolean',
					default: false,
					description: 'Whether every record of the selected entities must have a value',
				}),
			],
		},
		jsonBodyProperty(
			showFor(),
			'Other custom property fields from the Hyperline API reference, such as default_value, which must match the type. Fields set above take precedence.',
			'{\n  "default_value": "standard"\n}',
		),
	];
}

export const customPropertyDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a custom property',
				description: 'Define a custom field for customers, invoices, subscriptions and other records',
				method: 'POST',
				url: '/v1/custom-properties',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a custom property',
				description: 'Delete a custom property definition and its values on all records',
				method: 'DELETE',
				url: '=/v1/custom-properties/{{$parameter.customPropertyId}}',
				output: 'success',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many custom properties',
				description: 'List the custom properties defined on the account',
				method: 'GET',
				url: '/v1/custom-properties',
				output: 'list',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a custom property',
				description: 'Replace the definition of a custom property',
				method: 'PUT',
				url: '=/v1/custom-properties/{{$parameter.customPropertyId}}',
			}),
		],
		'getAll',
	),
	idParameter({
		name: 'customPropertyId',
		displayName: 'Custom Property ID',
		displayOptions: show(['delete', 'update']),
	}),

	...customPropertyFields('create'),
	...customPropertyFields('update'),

	// Get Many
	...paginationProperties(show(['getAll']), 'none'),
];
