import type { INodeProperties } from 'n8n-workflow';
import { idParameter, paginationProperties, queryOption } from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'quoteTemplate';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const getManyQueryParameters = ['name', 'name__contains', 'search', 'subscription_template_id'];

export const quoteTemplateDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a quote template',
				description:
					'Get a quote template with its quote defaults, display options, attachments and contract clauses',
				method: 'GET',
				url: '=/v1/quotes/templates/{{$parameter.quoteTemplateId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many quote templates',
				description: 'List the quote templates new quotes can start from',
				method: 'GET',
				url: '/v1/quotes/templates',
				output: 'list',
			}),
		],
		'get',
	),
	idParameter({
		name: 'quoteTemplateId',
		displayName: 'Quote Template ID',
		placeholder: 'e.g. qtp_...',
		displayOptions: show(['get']),
	}),

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
			queryOption({
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Exact match on the template name',
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
			queryOption({
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Free-text search across quote template fields',
			}),
			queryOption(
				{
					displayName: 'Subscription Template ID',
					name: 'subscriptionTemplateId',
					type: 'string',
					default: '',
					description: 'Only templates based on this subscription template',
				},
				'subscription_template_id',
			),
		],
	},
];
