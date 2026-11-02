import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	idParameter,
	jsonParameter,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'subscriptionTransition';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const getManyQueryParameters = [
	'status',
	'source_subscription_id',
	'base_subscription_id',
	'target_subscription_id',
	'transition_date__gte',
	'transition_date__lte',
	'transitioned_at__gte',
	'transitioned_at__lte',
];

const TARGET_SUBSCRIPTION_PLACEHOLDER = `{
  "products": [
    {
      "id": "itm_...",
      "payment_interval": { "period": "months", "count": 1 },
      "prices": [{ "type": "fee", "amount": 10000 }]
    }
  ]
}`;

/** Create and Preview take the same body, so Preview shows what Create would do. */
function transitionFields(forOperation: 'create' | 'preview'): INodeProperties[] {
	const showFor = (extra: Record<string, string[]> = {}) => ({
		show: { resource: [RESOURCE], operation: [forOperation], ...extra },
	});
	const options: INodeProperties[] = [
		bodyOption({
			displayName: 'Billing Cycle Transition Method',
			name: 'billingCycleTransitionMethod',
			type: 'options',
			options: [
				{
					name: 'Align to New Billing Cycle',
					value: 'align_to_new_billing_cycle',
					description: 'Start the billing cycle on the transition date',
				},
				{
					name: 'Keep Current Billing Cycle',
					value: 'keep_current_billing_cycle',
					description:
						'Keep the current billing dates. Rejected when the phases share no billing periodicity.',
				},
			],
			default: 'keep_current_billing_cycle',
			description: 'How billing dates carry over to the new subscription. Defaults to Keep Current Billing Cycle.',
		}, 'billing_cycle_transition_method'),
		bodyOption({
			displayName: 'Calculation Method',
			name: 'calculationMethod',
			type: 'options',
			options: [
				{
					name: 'Do Not Charge',
					value: 'do_not_charge',
					description: 'Generate no transition invoice',
				},
				{
					name: 'Pro Rata',
					value: 'pro_rata',
					description: 'Invoice the prorated amount for the rest of the period',
				},
				{
					name: 'Pro Rata With Separate Documents',
					value: 'pro_rata_separate_documents',
					description:
						'Credit the current period with a credit note and invoice the new configuration separately',
				},
			],
			default: 'pro_rata',
			description: 'How the transition is charged',
		}, 'calculation_method'),
		bodyOption({
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			description: 'Name of the transition',
		}),
	];
	if (forOperation === 'preview') {
		options.push(
			bodyOption({
				displayName: 'Transition ID',
				name: 'transitionId',
				type: 'string',
				default: '',
				description: 'Existing transition to preview the changes of',
			}, 'transition_id'),
		);
	}

	return [
		{
			...recordLocator({
				name: 'subscription',
				displayName: 'Source Subscription',
				searchListMethod: 'getSubscriptions',
				searchable: false,
				idPrefix: 'sub_',
				displayOptions: showFor(),
				description: 'The subscription to transition from',
			}),
			routing: {
				send: {
					type: 'body',
					property: 'source_subscription_id',
					value: '={{ $parameter.subscription }}',
				},
			},
		},
		{
			displayName: 'Application Schedule',
			name: 'applicationSchedule',
			type: 'options',
			required: true,
			options: [
				{
					name: 'Immediately',
					value: 'immediately',
				},
				{
					name: 'Last Renewal',
					value: 'last_renewal',
					description:
						'Apply from the start of the current billing period, refunding what was invoiced for it and charging the new configuration',
				},
				{
					name: 'Scheduled',
					value: 'scheduled',
					description: 'Apply on the Transition Date',
				},
			],
			default: 'immediately',
			description: 'When the transition applies',
			displayOptions: showFor(),
			routing: { send: { type: 'body', property: 'application_schedule' } },
		},
		{
			displayName: 'Transition Date',
			name: 'transitionDate',
			type: 'dateTime',
			required: true,
			default: '',
			description:
				'Date the transition occurs. A past date within the current billing period applies it immediately.',
			displayOptions: showFor({ applicationSchedule: ['scheduled'] }),
			routing: { send: { type: 'body', property: 'transition_date' } },
		},
		jsonParameter({
			displayName: 'Target Subscription (JSON)',
			name: 'targetSubscription',
			property: 'target_subscription',
			required: true,
			displayOptions: showFor(),
			description:
				'Configuration of the subscription to transition to: a template_id, or products or phases, plus any other subscription field. Amounts are in cents.',
			placeholder: TARGET_SUBSCRIPTION_PLACEHOLDER,
		}),
		{
			displayName: forOperation === 'create' ? 'Additional Fields' : 'Options',
			name: forOperation === 'create' ? 'additionalFields' : 'previewOptions',
			type: 'collection',
			placeholder: forOperation === 'create' ? 'Add Field' : 'Add Option',
			default: {},
			displayOptions: showFor(),
			options,
		},
	];
}

export const subscriptionTransitionDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a subscription transition',
				description: 'Cancel a scheduled subscription transition before it applies',
				method: 'POST',
				url: '=/v2/subscriptions/transitions/{{$parameter.transitionId}}/cancel',
				output: 'success',
			}),
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a subscription transition',
				description:
					'Move a customer from one subscription to another, now, on a date or from the last renewal',
				method: 'POST',
				url: '/v2/subscriptions/transitions',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a subscription transition',
				description: 'Get a subscription transition with its source and target subscriptions and schedule',
				method: 'GET',
				url: '=/v2/subscriptions/transitions/{{$parameter.transitionId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many subscription transitions',
				description: 'List subscription transitions',
				method: 'GET',
				url: '/v2/subscriptions/transitions',
				output: 'list',
			}),
			operation({
				name: 'Preview',
				value: 'preview',
				action: 'Preview a subscription transition',
				description: 'Preview the result of a subscription transition without applying it',
				method: 'POST',
				url: '/v2/subscriptions/transitions/preview',
			}),
		],
		'get',
	),
	idParameter({
		name: 'transitionId',
		displayName: 'Transition ID',
		displayOptions: show(['cancel', 'get']),
	}),

	// Create and Preview
	...transitionFields('create'),
	...transitionFields('preview'),

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
				displayName: 'Base Subscription ID',
				name: 'baseSubscriptionId',
				type: 'string',
				default: '',
				placeholder: 'e.g. sub_amiaWZ3lzDIWaoT',
			}, 'base_subscription_id'),
			queryOption({
				displayName: 'Source Subscription ID',
				name: 'sourceSubscriptionId',
				type: 'string',
				default: '',
				placeholder: 'e.g. sub_amiaWZ3lzDIWaoT',
				description: 'Subscription the transition moves away from',
			}, 'source_subscription_id'),
			queryOption({
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Cancelled', value: 'cancelled' },
					{ name: 'Changes Requested', value: 'changes_requested' },
					{ name: 'Completed', value: 'completed' },
					{ name: 'Draft', value: 'draft' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Pending Approval', value: 'pending_approval' },
					{ name: 'Pending Quote Signature', value: 'pending_quote_signature' },
					{ name: 'Scheduled', value: 'scheduled' },
				],
				default: 'scheduled',
			}),
			queryOption({
				displayName: 'Target Subscription ID',
				name: 'targetSubscriptionId',
				type: 'string',
				default: '',
				placeholder: 'e.g. sub_amiaWZ3lzDIWaoT',
				description: 'Subscription the transition creates',
			}, 'target_subscription_id'),
			queryOption({
				displayName: 'Transition Date After',
				name: 'transitionDateAfter',
				type: 'dateTime',
				default: '',
				description: 'Only transitions planned for this date or later',
			}, 'transition_date__gte'),
			queryOption({
				displayName: 'Transition Date Before',
				name: 'transitionDateBefore',
				type: 'dateTime',
				default: '',
				description: 'Only transitions planned for this date or earlier',
			}, 'transition_date__lte'),
			queryOption({
				displayName: 'Transitioned After',
				name: 'transitionedAfter',
				type: 'dateTime',
				default: '',
				description: 'Only transitions applied at or after this date',
			}, 'transitioned_at__gte'),
			queryOption({
				displayName: 'Transitioned Before',
				name: 'transitionedBefore',
				type: 'dateTime',
				default: '',
				description: 'Only transitions applied at or before this date',
			}, 'transitioned_at__lte'),
		],
	},
];
