import type { INodeProperties } from 'n8n-workflow';
import { paginationProperties, queryOption } from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'auditLog';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const auditLogGetManyQueryParameters = [
	'customer_id',
	'invoice_id',
	'quote_id',
	'subscription_id',
	'transaction_id',
];

export const auditLogDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many audit logs',
				description: 'List audit log entries, optionally for one customer, invoice, quote, subscription or transaction',
				method: 'GET',
				url: '/v1/audit-logs',
				output: 'list',
			}),
		],
		'getAll',
	),

	// Get Many
	...paginationProperties(show(['getAll']), 'cursor', auditLogGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				placeholder: 'e.g. cus_DKL4Xcb5VSa8CQ',
			}, 'customer_id'),
			queryOption({
				displayName: 'Invoice ID',
				name: 'invoiceId',
				type: 'string',
				default: '',
				placeholder: 'e.g. inv_DKL4Xcb5VSa8CQ',
			}, 'invoice_id'),
			queryOption({
				displayName: 'Quote ID',
				name: 'quoteId',
				type: 'string',
				default: '',
				placeholder: 'e.g. quo_DKL4Xcb5VSa8CQ',
			}, 'quote_id'),
			queryOption({
				displayName: 'Subscription ID',
				name: 'subscriptionId',
				type: 'string',
				default: '',
				placeholder: 'e.g. sub_amiaWZ3lzDIWaoT',
			}, 'subscription_id'),
			queryOption({
				displayName: 'Transaction ID',
				name: 'transactionId',
				type: 'string',
				default: '',
			}, 'transaction_id'),
		],
	},
];
