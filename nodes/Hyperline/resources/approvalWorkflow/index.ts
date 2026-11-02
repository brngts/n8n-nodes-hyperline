import type { INodeProperties } from 'n8n-workflow';
import {
	LIST_VALUE,
	bodyOption,
	idParameter,
	jsonBodyProperty,
	jsonParameter,
	paginationProperties,
	queryOption,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'approvalWorkflow';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const getManyQueryParameters = ['is_active'];

/** Create and Update take the same body: Hyperline replaces the workflow on update. */
function approvalWorkflowFields(forOperation: 'create' | 'update'): INodeProperties[] {
	const showFor = { show: { resource: [RESOURCE], operation: [forOperation] } };
	return [
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			required: true,
			default: '',
			displayOptions: showFor,
			routing: { send: { type: 'body', property: 'name' } },
		},
		jsonParameter({
			displayName: 'Steps (JSON)',
			name: 'steps',
			property: 'steps',
			shape: 'array',
			required: true,
			displayOptions: showFor,
			description:
				'Approval steps in the order they run, each with its approvers, in the format of the Hyperline API reference',
		}),
		{
			displayName: forOperation === 'create' ? 'Additional Fields' : 'Update Fields',
			name: forOperation === 'create' ? 'additionalFields' : 'updateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: showFor,
			options: [
				bodyOption(
					{
						displayName: 'Active',
						name: 'isActive',
						type: 'boolean',
						default: true,
						description: 'Whether the workflow is used to route new approval requests',
					},
					'is_active',
				),
				{
					displayName: 'Applicable Flows',
					name: 'applicableFlows',
					type: 'string',
					default: '',
					placeholder: 'e.g. workflow_step',
					description:
						'Comma-separated flows the workflow can be used in. Include workflow_step to use it in a Request approval step of a Hyperline workflow.',
					routing: {
						send: {
							type: 'body',
							property: 'applicable_flows',
							value: LIST_VALUE,
						},
					},
				},
				bodyOption({
					displayName: 'Description',
					name: 'description',
					type: 'string',
					default: '',
				}),
				bodyOption(
					{
						displayName: 'Email Notifications',
						name: 'emailNotificationEnabled',
						type: 'boolean',
						default: true,
						description: 'Whether approvers are notified by email when their approval is requested',
					},
					'email_notification_enabled',
				),
				bodyOption({
					displayName: 'Priority',
					name: 'priority',
					type: 'number',
					default: 0,
					description: 'Priority of the workflow over the other approval workflows that match the same request',
				}),
			],
		},
		jsonBodyProperty(
			showFor,
			'Other approval workflow fields from the Hyperline API reference, such as rules (which requests the workflow applies to) and step_execution. Fields set above take precedence.',
			'{\n  "rules": []\n}',
		),
	];
}

export const approvalWorkflowDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create an approval workflow',
				description: 'Create an approval workflow with its steps and approvers',
				method: 'POST',
				url: '/v1/approvals/workflows',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete an approval workflow',
				description: 'Delete an approval workflow',
				method: 'DELETE',
				url: '=/v1/approvals/workflows/{{$parameter.approvalWorkflowId}}',
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get an approval workflow',
				description: 'Get an approval workflow with its steps and approvers',
				method: 'GET',
				url: '=/v1/approvals/workflows/{{$parameter.approvalWorkflowId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many approval workflows',
				description: 'List approval workflows with their steps and approvers',
				method: 'GET',
				url: '/v1/approvals/workflows',
				output: 'list',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update an approval workflow',
				description: 'Replace the name, steps and settings of an approval workflow',
				method: 'PUT',
				url: '=/v1/approvals/workflows/{{$parameter.approvalWorkflowId}}',
			}),
		],
		'get',
	),
	idParameter({
		name: 'approvalWorkflowId',
		displayName: 'Approval Workflow ID',
		displayOptions: show(['delete', 'get', 'update']),
	}),

	...approvalWorkflowFields('create'),
	...approvalWorkflowFields('update'),

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
					displayName: 'Active',
					name: 'isActive',
					type: 'boolean',
					default: true,
					description: 'Whether to return only active workflows, or only inactive ones',
				},
				'is_active',
			),
		],
	},
];
