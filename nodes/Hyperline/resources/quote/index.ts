import type { INodeProperties } from 'n8n-workflow';
import {
	binaryPropertyName,
	bodyOption,
	byDisplayName,
	customerBodyLocator,
	jsonBodyProperty,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { pdfToBinary } from '../../shared/postReceive';

const RESOURCE = 'quote';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const quoteGetManyQueryParameters = [
	'customer_id',
	'status',
	'template_id',
	'crm_opportunity_id',
	'number',
	'updated_at__gte',
];

const sharedQuoteFields: INodeProperties[] = [
	bodyOption({
		displayName: 'Comments',
		name: 'comments',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'Comments shown to the customer on the quote',
	}),
	bodyOption({
		displayName: 'Expires At',
		name: 'expiresAt',
		type: 'dateTime',
		default: '',
	}, 'expires_at'),
	bodyOption({
		displayName: 'Owner Email',
		name: 'ownerEmail',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Email of the Hyperline user who owns the quote',
	}, 'owner_email'),
	bodyOption({
		displayName: 'Terms',
		name: 'terms',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'Leave empty to keep the terms of the template',
	}),
];

export const quoteDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a quote',
				description: 'Create a draft quote for a customer',
				method: 'POST',
				url: '/v1/quotes',
			}),
			operation({
				name: 'Download',
				value: 'download',
				action: 'Download a quote',
				description: 'Download the PDF of a quote',
				method: 'GET',
				url: '=/v1/quotes/{{$parameter.quote}}/download',
				output: [pdfToBinary('quote', 'quote')],
				request: {
					encoding: 'arraybuffer',
					json: false,
					headers: { Accept: 'application/pdf' },
				},
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a quote',
				description: 'Get a quote by ID',
				method: 'GET',
				url: '=/v1/quotes/{{$parameter.quote}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many quotes',
				description: 'List quotes',
				method: 'GET',
				url: '/v1/quotes',
				output: 'list',
			}),
			operation({
				name: 'Send',
				value: 'send',
				action: 'Send a quote',
				description: 'Email a quote to the customer for signature',
				method: 'POST',
				url: '=/v1/quotes/{{$parameter.quote}}/send',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a quote',
				description: 'Update a draft quote',
				method: 'PATCH',
				url: '=/v1/quotes/{{$parameter.quote}}',
			}),
			operation({
				name: 'Void',
				value: 'void',
				action: 'Void a quote',
				description: 'Void a quote so it can no longer be signed',
				method: 'POST',
				url: '=/v1/quotes/{{$parameter.quote}}/void',
			}),
		],
		'get',
	),
	recordLocator({
		name: 'quote',
		displayName: 'Quote',
		searchListMethod: 'getQuotes',
		searchable: true,
		idPrefix: 'quo_',
		displayOptions: show(['download', 'get', 'send', 'update', 'void']),
	}),

	// Create
	customerBodyLocator(show(['create']), 'The customer the quote is for'),
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		default: '',
		placeholder: 'e.g. qtp_...',
		description:
			'Quote template to start from, which keeps its terms and contract documents. Without a template, set expires_at and a subscription or invoice in the JSON field.',
		displayOptions: show(['create']),
		routing: {
			send: {
				type: 'body',
				property: 'template_id',
				value: '={{ $value === "" ? undefined : $value }}',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: sharedQuoteFields,
	},
	jsonBodyProperty(
		show(['create']),
		'The subscription or invoice the quote proposes, plus any other quote fields from the Hyperline API reference. Amounts are in cents. Fields set above take precedence.',
		'{\n  "subscription": { "name": "Enterprise", "contract_terms": { "renew_automatically": true } }\n}',
	),

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			...sharedQuoteFields,
			bodyOption({
				displayName: 'CRM Opportunity ID',
				name: 'crmOpportunityId',
				type: 'string',
				default: '',
				description: 'Only settable after the quote is created',
			}, 'crm_opportunity_id'),
		].sort(byDisplayName),
	},
	jsonBodyProperty(
		show(['update']),
		'The subscription or invoice the quote proposes, plus any other quote fields from the Hyperline API reference. Fields set above take precedence.',
		'{\n  "subscription": { "purchase_order": "PO-123" }\n}',
	),

	// Send
	{
		displayName: 'Options',
		name: 'sendOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['send']),
		options: [
			bodyOption({
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Recipient of the signature request. Required unless the quote has signers.',
			}),
			bodyOption({
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Custom message in the email',
			}),
		],
	},

	// Void
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		required: true,
		default: '',
		description: 'Why the quote is voided',
		displayOptions: show(['void']),
		routing: { send: { type: 'body', property: 'reason' } },
	},

	// Download
	binaryPropertyName(show(['download'])),
	{
		displayName: 'Options',
		name: 'downloadOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['download']),
		options: [
			queryOption({
				displayName: 'Locale',
				name: 'locale',
				type: 'string',
				default: '',
				placeholder: 'e.g. de',
				description: 'Language of the PDF. Defaults to the language of the customer.',
			}),
		],
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'offset', quoteGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'CRM Opportunity ID',
				name: 'crmOpportunityId',
				type: 'string',
				default: '',
			}, 'crm_opportunity_id'),
			queryOption({
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				placeholder: 'e.g. cus_DKL4Xcb5VSa8CQ',
			}, 'customer_id'),
			queryOption({
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
			}),
			queryOption({
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'Approved', value: 'approved' },
					{ name: 'Changes Requested', value: 'changes_requested' },
					{ name: 'Draft', value: 'draft' },
					{ name: 'Expired', value: 'expired' },
					{ name: 'Pending Approval', value: 'pending_approval' },
					{ name: 'Pending Signature', value: 'pending_signature' },
					{ name: 'Signed', value: 'signed' },
					{ name: 'Voided', value: 'voided' },
				],
				default: 'all',
			}),
			queryOption({
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
			}, 'template_id'),
			queryOption({
				displayName: 'Updated After',
				name: 'updatedAfter',
				type: 'dateTime',
				default: '',
			}, 'updated_at__gte'),
		],
	},
];
