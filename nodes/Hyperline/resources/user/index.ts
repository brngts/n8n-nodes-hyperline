import type { INodeProperties } from 'n8n-workflow';
import { idParameter, paginationProperties, queryOption } from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'user';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const userGetManyQueryParameters = [
	'email',
	'email__contains',
	'first_name',
	'first_name__contains',
	'last_name',
	'last_name__contains',
];

export const userDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a user',
				description: 'Get a user of the Hyperline account by ID',
				method: 'GET',
				url: '=/v1/users/{{$parameter.userId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many users',
				description: 'List the users of the Hyperline account',
				method: 'GET',
				url: '/v1/users',
				output: 'list',
			}),
		],
		'get',
	),
	idParameter({
		name: 'userId',
		displayName: 'User ID',
		displayOptions: show(['get']),
	}),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset', userGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			}),
			queryOption({
				displayName: 'Email Contains',
				name: 'emailContains',
				type: 'string',
				default: '',
			}, 'email__contains'),
			queryOption({
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
			}, 'first_name'),
			queryOption({
				displayName: 'First Name Contains',
				name: 'firstNameContains',
				type: 'string',
				default: '',
			}, 'first_name__contains'),
			queryOption({
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
			}, 'last_name'),
			queryOption({
				displayName: 'Last Name Contains',
				name: 'lastNameContains',
				type: 'string',
				default: '',
			}, 'last_name__contains'),
		],
	},
];
