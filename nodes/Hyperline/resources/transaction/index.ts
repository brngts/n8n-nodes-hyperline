import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	customerBodyLocator,
	idParameter,
	paginationProperties,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { dateBodyOption } from '../../shared/dates';

const RESOURCE = 'transaction';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const transactionDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a transaction',
				description: 'Record an offline payment, refund or chargeback. No money is moved.',
				method: 'POST',
				url: '/v1/transactions',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a transaction',
				description: 'Delete an unallocated offline transaction. This does not reverse a payment.',
				method: 'DELETE',
				url: '=/v1/transactions/{{$parameter.transactionId}}',
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a transaction',
				description: 'Get a transaction with its invoice allocations',
				method: 'GET',
				url: '=/v1/transactions/{{$parameter.transactionId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many transactions',
				description: 'List transactions, including those not allocated to an invoice',
				method: 'GET',
				url: '/v1/transactions',
				output: 'list',
			}),
			operation({
				name: 'Refund',
				value: 'refund',
				action: 'Refund a transaction',
				description: 'Refund the full amount of a settled transaction and set its invoice back to to pay',
				method: 'POST',
				url: '=/v1/transactions/{{$parameter.transactionId}}/refund',
				output: 'success',
			}),
		],
		'get',
	),
	idParameter({
		name: 'transactionId',
		displayName: 'Transaction ID',
		displayOptions: show(['delete', 'get', 'refund']),
	}),

	// Create
	customerBodyLocator(show(['create']), 'The customer the transaction belongs to'),
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Chargeback',
				value: 'chargeback',
				description: 'A disputed payment taken back by the bank',
			},
			{
				name: 'One-Time Payment',
				value: 'one_time',
				description: 'A payment received outside Hyperline',
			},
			{
				name: 'Refund',
				value: 'refund',
				description: 'Money paid back to the customer outside Hyperline',
			},
		],
		default: 'one_time',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'type' } },
	},
	{
		displayName: 'Amount (Cents)',
		name: 'amount',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { numberPrecision: 0 },
		description: 'Positive amount in cents in the currency of the customer, for example 5000 for 50.00',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'amount' } },
	},
	dateBodyOption({
		displayName: 'Date',
		name: 'date',
		required: true,
		default: '={{ $now.toISO() }}',
		description: 'When the transaction settled',
		displayOptions: show(['create']),
	}),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			bodyOption({
				displayName: 'Bank Account ID',
				name: 'bankAccountId',
				type: 'string',
				default: '',
				description:
					'Bank account of a bank transfer, in the currency of the customer. Not allowed for external payments.',
			}, 'bank_account_id'),
			bodyOption({
				displayName: 'Original Transaction ID',
				name: 'originalTransactionId',
				type: 'string',
				default: '',
				description: 'Payment transaction that a refund or chargeback relates to',
			}, 'original_transaction_id'),
			bodyOption({
				displayName: 'Payment Method Type',
				name: 'paymentMethodType',
				type: 'options',
				options: [
					{ name: 'Bank Transfer', value: 'transfer' },
					{ name: 'External', value: 'external' },
				],
				default: 'transfer',
			}, 'payment_method_type'),
			bodyOption({
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				description: 'Reference identifying the offline payment',
			}),
		],
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'offset'),
];
