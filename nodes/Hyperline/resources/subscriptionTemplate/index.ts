import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	idParameter,
	jsonBodyProperty,
	jsonParameter,
	paginationProperties,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'subscriptionTemplate';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const PHASES_PLACEHOLDER = `[
  {
    "activation_strategy": "immediately",
    "end_strategy": "manual",
    "billing_date_setting": "phase_start",
    "products": [
      { "id": "itm_...", "payment_interval": { "period": "months", "count": 1 } }
    ]
  }
]`;

/** Create Configuration and Update Configuration take the same body: Hyperline replaces the configuration on update. */
function configurationFields(forOperation: 'createConfiguration' | 'updateConfiguration'): INodeProperties[] {
	const showFor = show([forOperation]);
	return [
		{
			displayName: 'Currency',
			name: 'currency',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. EUR',
			description: 'Three-letter ISO currency code the configuration prices the template in',
			displayOptions: showFor,
			routing: { send: { type: 'body', property: 'currency' } },
		},
		jsonParameter({
			displayName: 'Phases (JSON)',
			name: 'phases',
			property: 'phases',
			shape: 'array',
			required: true,
			displayOptions: showFor,
			description:
				'Phases of the configuration, each with an activation strategy, an end strategy, a billing date setting and products. Amounts are in cents.',
			placeholder: PHASES_PLACEHOLDER,
		}),
		{
			displayName: forOperation === 'createConfiguration' ? 'Additional Fields' : 'Update Fields',
			name: forOperation === 'createConfiguration' ? 'additionalFields' : 'updateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: showFor,
			options: [
				bodyOption({
					displayName: 'Add Tax to Document',
					name: 'addTaxToDocument',
					type: 'boolean',
					default: false,
					description: 'Whether to add taxes to the documents. Used when Generate Document is on.',
				}, 'add_tax_to_document'),
				bodyOption({
					displayName: 'Cancel At',
					name: 'cancelAt',
					type: 'dateTime',
					default: '',
					description: 'Date subscriptions created from this configuration are cancelled',
				}, 'cancel_at'),
				bodyOption({
					displayName: 'Cancellation Strategy',
					name: 'cancellationStrategy',
					type: 'options',
					options: [
						{
							name: 'Charge Custom Amount',
							value: 'charge_custom',
							description: 'Charge the customer a custom amount',
						},
						{
							name: 'Charge Pro Rata',
							value: 'charge_prorata',
							description: 'Charge the unpaid prorated amount up to the end of the current period',
						},
						{
							name: 'Do Nothing',
							value: 'do_nothing',
							description: 'End the subscription without charging or refunding',
						},
						{
							name: 'End of Period',
							value: 'end_of_period',
							description: 'Cancel at the end of the current billing period',
						},
						{
							name: 'Refund Custom Amount',
							value: 'refund_custom',
							description: 'Refund the customer a custom amount',
						},
						{
							name: 'Refund Pro Rata',
							value: 'refund_prorata',
							description: 'Refund the overpaid prorated amount from the cancellation date',
						},
					],
					default: 'do_nothing',
					description: 'What happens when a subscription created from this configuration is cancelled',
				}, 'cancellation_strategy'),
				bodyOption({
					displayName: 'Country',
					name: 'country',
					type: 'string',
					default: '',
					placeholder: 'e.g. FR',
					description: 'Two-letter ISO country code the configuration applies to',
				}),
				bodyOption({
					displayName: 'Document Name',
					name: 'documentName',
					type: 'string',
					default: '',
					description: 'Name of the generated documents. Used when Generate Document is on.',
				}, 'document_name'),
				bodyOption({
					displayName: 'Generate Document',
					name: 'generateDocument',
					type: 'boolean',
					default: false,
					description: 'Whether to generate non-legal documents instead of invoices',
				}, 'generate_document'),
				bodyOption({
					displayName: 'Generate Draft Invoices',
					name: 'generateDraftInvoices',
					type: 'boolean',
					default: false,
					description: 'Whether invoices start as drafts that must be reviewed and validated',
				}, 'generate_draft_invoices'),
				bodyOption({
					displayName: 'Minimum Invoice Fee (Cents)',
					name: 'minimumInvoiceFee',
					type: 'number',
					default: 0,
					typeOptions: { minValue: 0 },
					description: 'Minimum amount of each invoice, outside one-time payments',
				}, 'minimum_invoice_fee'),
				bodyOption({
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
				}),
			],
		},
		jsonBodyProperty(
			showFor,
			'Contract terms, custom properties and other configuration fields from the Hyperline API reference. Fields set above take precedence.',
			'{\n  "contract_terms": { "activation_strategy": "start_date", "end_strategy": "manual" }\n}',
		),
	];
}

export const subscriptionTemplateDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a subscription template',
				description:
					'Create a subscription template, then add its phases and prices with Create Configuration',
				method: 'POST',
				url: '/v1/subscriptions/templates',
			}),
			operation({
				name: 'Create Configuration',
				value: 'createConfiguration',
				action: 'Create a subscription template configuration',
				description: 'Add a configuration with phases and products to a subscription template',
				method: 'POST',
				url: '=/v1/subscriptions/templates/{{$parameter.templateId}}/configurations',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a subscription template',
				description: 'Permanently delete a subscription template',
				method: 'DELETE',
				url: '=/v1/subscriptions/templates/{{$parameter.templateId}}',
				output: 'success',
			}),
			operation({
				name: 'Delete Configuration',
				value: 'deleteConfiguration',
				action: 'Delete a subscription template configuration',
				description: 'Permanently delete a configuration of a subscription template',
				method: 'DELETE',
				url: '=/v1/subscriptions/templates/{{$parameter.templateId}}/configurations/{{$parameter.configurationId}}',
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a subscription template',
				description: 'Get a subscription template with its products, phases and prices',
				method: 'GET',
				url: '=/v1/subscriptions/templates/{{$parameter.templateId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many subscription templates',
				description: 'List subscription templates',
				method: 'GET',
				url: '/v1/subscriptions/templates',
				output: 'list',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a subscription template',
				description: 'Update the name or description of a subscription template',
				method: 'PATCH',
				url: '=/v1/subscriptions/templates/{{$parameter.templateId}}',
			}),
			operation({
				name: 'Update Configuration',
				value: 'updateConfiguration',
				action: 'Update a subscription template configuration',
				description: 'Replace the phases and settings of a subscription template configuration',
				method: 'PUT',
				url: '=/v1/subscriptions/templates/{{$parameter.templateId}}/configurations/{{$parameter.configurationId}}',
			}),
		],
		'get',
	),
	idParameter({
		name: 'templateId',
		displayName: 'Template ID',
		displayOptions: show([
			'createConfiguration',
			'delete',
			'deleteConfiguration',
			'get',
			'update',
			'updateConfiguration',
		]),
	}),
	idParameter({
		name: 'configurationId',
		displayName: 'Configuration ID',
		displayOptions: show(['deleteConfiguration', 'updateConfiguration']),
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
		],
	},

	// Create Configuration and Update Configuration
	...configurationFields('createConfiguration'),
	...configurationFields('updateConfiguration'),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset'),
];
