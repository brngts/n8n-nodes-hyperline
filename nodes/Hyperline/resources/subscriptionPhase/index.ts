import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	idParameter,
	paginationProperties,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'subscriptionPhase';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const subscriptionPhaseDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a subscription phase',
				description: 'Get a phase of a subscription with its products and billing configuration',
				method: 'GET',
				url: '=/v2/subscriptions/{{$parameter.subscription}}/phases/{{$parameter.phaseId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many subscription phases',
				description: 'List the phases of a subscription',
				method: 'GET',
				url: '=/v2/subscriptions/{{$parameter.subscription}}/phases',
				output: 'list',
			}),
			operation({
				name: 'Transition to Next Phase',
				value: 'transitionToNext',
				action: 'Transition a subscription to its next phase',
				description: 'Move a subscription to its next configured phase',
				method: 'POST',
				url: '=/v2/subscriptions/{{$parameter.subscription}}/next-phase',
			}),
		],
		'getAll',
	),
	recordLocator({
		name: 'subscription',
		displayName: 'Subscription',
		searchListMethod: 'getSubscriptions',
		searchable: false,
		idPrefix: 'sub_',
		displayOptions: show(['get', 'getAll', 'transitionToNext']),
	}),
	idParameter({
		name: 'phaseId',
		displayName: 'Phase ID',
		displayOptions: show(['get']),
	}),

	// Transition to Next Phase
	{
		displayName: 'Options',
		name: 'transitionOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['transitionToNext']),
		options: [
			bodyOption({
				displayName: 'Transition Date',
				name: 'transitionDate',
				type: 'dateTime',
				default: '',
				description:
					'Date the transition applies from, used to compute pro rata amounts and the dates shown on invoices. Defaults to now.',
			}, 'transition_date'),
		],
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'none'),
];
