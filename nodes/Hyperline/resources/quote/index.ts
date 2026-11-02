import type { INodeProperties } from 'n8n-workflow';
import {
	binaryInputProperty,
	binaryPropertyName,
	bodyOption,
	byDisplayName,
	customerBodyLocator,
	idParameter,
	jsonBodyProperty,
	jsonParameter,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { DOWNLOAD_REQUEST, operation, operationSelector } from '../../shared/operations';
import { binaryDownload, pdfToBinary, returnSuccess, unwrapList } from '../../shared/postReceive';
import { sendMultipartFile } from '../../shared/preSend';

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
				name: 'Approve',
				value: 'approve',
				action: 'Approve a quote',
				description: 'Approve a quote as the account owner so it can be sent for signature',
				method: 'POST',
				url: '=/v1/quotes/{{$parameter.quote}}/approve',
				output: 'success',
			}),
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
				name: 'Download File',
				value: 'downloadFile',
				action: 'Download a file of a quote',
				description: 'Download an attachment or the manually signed file of a quote',
				method: 'GET',
				url: '=/v1/quotes/{{$parameter.quote}}/files/{{$parameter.fileId}}/download',
				output: [binaryDownload({ fileNamePrefix: 'quote-file', idParameter: 'fileId' })],
				request: DOWNLOAD_REQUEST,
			}),
			operation({
				name: 'Duplicate',
				value: 'duplicate',
				action: 'Duplicate a quote',
				description: 'Create a draft copy of a quote with its subscription or invoice configuration',
				method: 'POST',
				url: '=/v1/quotes/{{$parameter.quote}}/duplicate',
			}),
			operation({
				name: 'Finalize',
				value: 'finalize',
				action: 'Finalize a quote',
				description: 'Finalize a draft quote, which submits it for approval when approval is required',
				method: 'POST',
				url: '=/v1/quotes/{{$parameter.quote}}/finalize',
				output: 'success',
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
				name: 'Get Approvals',
				value: 'getApprovals',
				action: 'Get the approvals of a quote',
				description: 'Get the approval request, steps and decisions of a quote without submitting it',
				method: 'GET',
				url: '=/v1/quotes/{{$parameter.quote}}/approvals',
				output: 'list',
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
				name: 'Get Signers',
				value: 'getSigners',
				action: 'Get the signers of a quote',
				description: 'List the signers of a quote in signing order, with the status of each',
				method: 'GET',
				url: '=/v1/quotes/{{$parameter.quote}}/signers',
				output: 'list',
			}),
			operation({
				name: 'Get Valuation',
				value: 'getValuation',
				action: 'Get the valuation of a quote',
				description: 'Get the contract value, recurring contract value and ARR of a subscription quote',
				method: 'GET',
				url: '=/v1/quotes/{{$parameter.quote}}/valuation',
			}),
			operation({
				name: 'Redraft',
				value: 'redraft',
				action: 'Redraft a quote',
				description: 'Switch a quote back to draft, which cancels pending approval and signature requests',
				method: 'POST',
				url: '=/v1/quotes/{{$parameter.quote}}/redraft',
				output: 'success',
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
				name: 'Set Signers',
				value: 'setSigners',
				action: 'Set the signers of a quote',
				description: 'Replace the signature workflow of a quote',
				method: 'PUT',
				url: '=/v1/quotes/{{$parameter.quote}}/signers',
				// Clearing the signers may answer with an empty list, which would otherwise stop the workflow
				output: [unwrapList, returnSuccess],
			}),
			operation({
				name: 'Sign',
				value: 'sign',
				action: 'Sign a quote',
				description: 'Mark a quote as signed outside Hyperline, optionally with the signed file',
				method: 'POST',
				url: '=/v1/quotes/{{$parameter.quote}}/sign',
				output: 'success',
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
		displayOptions: show([
			'approve',
			'download',
			'downloadFile',
			'duplicate',
			'finalize',
			'get',
			'getApprovals',
			'getSigners',
			'getValuation',
			'redraft',
			'send',
			'setSigners',
			'sign',
			'update',
			'void',
		]),
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

	// Download File
	idParameter({
		name: 'fileId',
		displayName: 'File ID',
		description: 'ID of the attachment or manually signed file, as listed on the quote',
		displayOptions: show(['downloadFile']),
	}),
	binaryPropertyName(show(['downloadFile']), 'file'),

	// Finalize
	{
		displayName: 'Options',
		name: 'finalizeOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['finalize']),
		options: [
			bodyOption({
				displayName: 'Requester Comment',
				name: 'requesterComment',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Internal comment for the approvers, not shown on the quote',
			}, 'requester_comment'),
		],
	},

	// Get Valuation
	{
		displayName: 'Options',
		name: 'valuationOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['getValuation']),
		options: [
			queryOption({
				displayName: 'Granularity',
				name: 'granularity',
				type: 'options',
				options: [
					{ name: 'Month', value: 'month' },
					{ name: 'Quarter', value: 'quarter' },
					{ name: 'Year', value: 'year' },
				],
				default: 'month',
				description: 'Adds a breakdown of the contract value and recurring contract value per period',
			}),
		],
	},

	// Set Signers
	jsonParameter({
		displayName: 'Signers (JSON)',
		name: 'signers',
		property: 'signers',
		shape: 'array',
		required: true,
		displayOptions: show(['setSigners']),
		description:
			'The full signature workflow, which replaces the current one. Each signer needs kind (external or countersigner), step_order and email, and can set first_name, last_name, language and, for countersigners, user_id. Signers with the same step_order sign in parallel. Send an empty array to go back to the single-signer flow.',
		placeholder:
			'[\n  { "kind": "external", "step_order": 1, "email": "name@email.com", "first_name": "Jane", "last_name": "Doe" },\n  { "kind": "countersigner", "step_order": 2, "email": "sales@email.com" }\n]',
	}),

	// Sign
	{
		displayName: 'Attach Signed File',
		name: 'attachSignedFile',
		type: 'boolean',
		default: false,
		description: 'Whether to upload the signed quote (PDF or Word document) from an input binary field',
		displayOptions: show(['sign']),
	},
	{
		...binaryInputProperty(
			{ show: { resource: [RESOURCE], operation: ['sign'], attachSignedFile: [true] } },
			'signed quote',
		),
		routing: { send: { preSend: [sendMultipartFile('signed_quote')] } },
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
