import type { INodeProperties } from 'n8n-workflow';
import { idParameter, paginationProperties } from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'bankAccount';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const bankAccountDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a bank account',
				description: 'Get a bank account with its masked details, type, balance and currency',
				method: 'GET',
				url: '=/v1/bank-accounts/{{$parameter.bankAccountId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many bank accounts',
				description: 'List the bank accounts configured on the account',
				method: 'GET',
				url: '/v1/bank-accounts',
				output: 'list',
			}),
			operation({
				name: 'Get Transactions',
				value: 'getTransactions',
				action: 'Get transactions of a bank account',
				description: 'List the open banking transactions of a bank account',
				method: 'GET',
				url: '=/v1/bank-accounts/{{$parameter.bankAccountId}}/transactions',
				output: 'list',
			}),
		],
		'getAll',
	),
	idParameter({
		name: 'bankAccountId',
		displayName: 'Bank Account ID',
		displayOptions: show(['get', 'getTransactions']),
	}),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset'),

	// Get Transactions
	...paginationProperties(show(['getTransactions']), 'cursor'),
];
