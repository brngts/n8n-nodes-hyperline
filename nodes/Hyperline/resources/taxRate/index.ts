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

const RESOURCE = 'taxRate';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const getManyQueryParameters = ['name', 'name__contains', 'description__contains', 'invoicing_entity_id'];

const JSON_BODY_HINT =
	'Other tax rate fields from the Hyperline API reference, such as type and scope. Fields set above take precedence.';
const JSON_BODY_PLACEHOLDER = '{\n  "type": "...",\n  "scope": "..."\n}';

/** Fields Create and Update share. The rate class and invoicing entity can only be set on create. */
const taxRateFields: INodeProperties[] = [
	bodyOption({
		displayName: 'Code',
		name: 'code',
		type: 'string',
		default: '',
		description: 'Tax code, for example the one used in your accounting software',
	}),
	bodyOption({
		displayName: 'Country',
		name: 'country',
		type: 'string',
		default: '',
		placeholder: 'e.g. FR',
		description: 'Two-letter ISO country code the tax rate applies in',
	}),
	bodyOption({
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
	}),
];

export const taxRateDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a tax rate',
				description: 'Create a custom tax rate',
				method: 'POST',
				url: '/v1/taxes/rates',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a tax rate',
				description: 'Delete a custom tax rate',
				method: 'DELETE',
				url: '=/v1/taxes/rates/{{$parameter.taxRateId}}',
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a tax rate',
				description: 'Get a custom or default tax rate',
				method: 'GET',
				url: '=/v1/taxes/rates/{{$parameter.taxRateId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many tax rates',
				description: 'List custom and default tax rates',
				method: 'GET',
				url: '/v1/taxes/rates',
				output: 'list',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a tax rate',
				description: 'Change the fields you set on a custom tax rate',
				method: 'PATCH',
				url: '=/v1/taxes/rates/{{$parameter.taxRateId}}',
			}),
		],
		'get',
	),
	idParameter({
		name: 'taxRateId',
		displayName: 'Tax Rate ID',
		displayOptions: show(['delete', 'get', 'update']),
	}),

	// Create
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. VAT 20%',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Rate (%)',
		name: 'rate',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 0, maxValue: 100, numberPrecision: 3 },
		description: 'Tax rate as a percentage, for example 20 for 20%',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'rate' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			...taxRateFields,
			bodyOption(
				{
					displayName: 'Invoicing Entity ID',
					name: 'invoicingEntityId',
					type: 'string',
					default: '',
					description: 'Invoicing entity the tax rate belongs to',
				},
				'invoicing_entity_id',
			),
			bodyOption(
				{
					displayName: 'Rate Class',
					name: 'rateClass',
					type: 'options',
					options: [
						{ name: 'Exempt', value: 'exempt' },
						{ name: 'Parking Rate', value: 'parking_rate' },
						{ name: 'Reduced Rate', value: 'reduced_rate' },
						{ name: 'Reduced Rate (Alternative)', value: 'reduced_rate_alt' },
						{ name: 'Reverse Charge', value: 'reverse_charge' },
						{ name: 'Standard Rate', value: 'standard_rate' },
						{ name: 'Super Reduced Rate', value: 'super_reduced_rate' },
					],
					default: 'standard_rate',
					description: 'Class of the rate, which accounting rules can match on',
				},
				'rate_class',
			),
		].sort(byDisplayName),
	},
	jsonBodyProperty(show(['create']), JSON_BODY_HINT, JSON_BODY_PLACEHOLDER),

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			...taxRateFields,
			bodyOption({
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			}),
			bodyOption({
				displayName: 'Rate (%)',
				name: 'rate',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 100, numberPrecision: 3 },
				description: 'Tax rate as a percentage, for example 20 for 20%',
			}),
		].sort(byDisplayName),
	},
	jsonBodyProperty(show(['update']), JSON_BODY_HINT, JSON_BODY_PLACEHOLDER),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset', getManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption(
				{
					displayName: 'Description Contains',
					name: 'descriptionContains',
					type: 'string',
					default: '',
				},
				'description__contains',
			),
			queryOption(
				{
					displayName: 'Invoicing Entity ID',
					name: 'invoicingEntityId',
					type: 'string',
					default: '',
				},
				'invoicing_entity_id',
			),
			queryOption({
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Exact match on the tax rate name',
			}),
			queryOption(
				{
					displayName: 'Name Contains',
					name: 'nameContains',
					type: 'string',
					default: '',
				},
				'name__contains',
			),
		],
	},
];
