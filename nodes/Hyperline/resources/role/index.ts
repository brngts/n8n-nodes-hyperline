import type { INodeProperties } from 'n8n-workflow';
import { idParameter, paginationProperties } from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'role';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const roleDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a role',
				description: 'Get a user role by ID',
				method: 'GET',
				url: '=/v1/users/roles/{{$parameter.roleId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many roles',
				description: 'List the user roles of the Hyperline account',
				method: 'GET',
				url: '/v1/users/roles',
				output: 'list',
			}),
		],
		'get',
	),
	idParameter({
		name: 'roleId',
		displayName: 'Role ID',
		displayOptions: show(['get']),
	}),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset'),
];
