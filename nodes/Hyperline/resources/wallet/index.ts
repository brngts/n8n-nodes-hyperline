import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	byDisplayName,
	customerBodyLocator,
	idParameter,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { dateBodyOption } from '../customerCredit/dates';

const RESOURCE = 'wallet';

const show = (operations: string[], extra: Record<string, Array<string | boolean>> = {}) => ({
	show: { resource: [RESOURCE], operation: operations, ...extra },
});

export const walletGetManyQueryParameters = ['customer_id'];

export const walletTransactionsQueryParameters = ['type', 'amount', 'invoice_id', 'comment'];

/** Optional fields shared by Create and Update. */
const autoLoadFields: INodeProperties[] = [
	bodyOption({
		displayName: 'Auto-Load Amount (Cents)',
		name: 'autoLoadAmount',
		type: 'number',
		default: 0,
		description: 'Amount in cents added on each auto-load, for example 10000 for 100.00',
	}, 'auto_load_amount'),
	bodyOption({
		displayName: 'Auto-Load Interval Count',
		name: 'autoLoadIntervalCount',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		description: 'Number of periods between auto-loads. Set together with Auto-Load Interval Period.',
	}, 'auto_load_interval.count'),
	bodyOption({
		displayName: 'Auto-Load Interval Period',
		name: 'autoLoadIntervalPeriod',
		type: 'options',
		options: [
			{ name: 'Days', value: 'days' },
			{ name: 'Months', value: 'months' },
			{ name: 'Weeks', value: 'weeks' },
			{ name: 'Years', value: 'years' },
		],
		default: 'months',
		description: 'Period unit between auto-loads. Set together with Auto-Load Interval Count.',
	}, 'auto_load_interval.period'),
	dateBodyOption({
		displayName: 'Auto-Load Next Date',
		name: 'autoLoadNextDate',
		default: '',
		description: 'When the next auto-load runs',
	}, 'auto_load_next_date'),
	bodyOption({
		displayName: 'Auto-Load Threshold (Cents)',
		name: 'autoLoadThreshold',
		type: 'number',
		default: 0,
		description: 'Balance in cents that triggers an auto-load',
	}, 'auto_load_threshold'),
	bodyOption({
		displayName: 'Auto-Load Type',
		name: 'autoLoadType',
		type: 'options',
		options: [
			{ name: 'Free', value: 'free', description: 'Grant the amount without collecting payment' },
			{ name: 'Paid', value: 'paid', description: 'Charge the customer for the amount' },
		],
		default: 'paid',
	}, 'auto_load_type'),
	bodyOption({
		displayName: 'Low Projected Balance Threshold (Cents)',
		name: 'lowProjectedBalanceThreshold',
		type: 'number',
		default: 0,
		description: 'Projected balance in cents below which the wallet counts as low',
	}, 'low_projected_balance_threshold'),
	bodyOption({
		displayName: 'Reset Balance Before Auto-Load',
		name: 'autoLoadReset',
		type: 'boolean',
		default: false,
		description: 'Whether the wallet balance is reset before each auto-load',
	}, 'auto_load_reset'),
];

function autoLoadEnabledParameter(forOperation: 'create' | 'update'): INodeProperties {
	return {
		displayName: 'Auto-Load Enabled',
		name: 'isAutoLoadEnabled',
		type: 'boolean',
		required: true,
		default: false,
		description:
			forOperation === 'create'
				? 'Whether the wallet is loaded automatically. Configure the auto-load under Additional Fields.'
				: 'Whether the wallet is loaded automatically. Hyperline expects it on every update, so keep it on for wallets that already auto-load.',
		displayOptions: show([forOperation]),
		routing: { send: { type: 'body', property: 'is_auto_load_enabled' } },
	};
}

export const walletDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a wallet',
				description: 'Create a prepaid wallet for a customer',
				method: 'POST',
				url: '/v1/wallets',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a wallet',
				description: 'Get a wallet with its balance, currency and customer',
				method: 'GET',
				url: '=/v1/wallets/{{$parameter.walletId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many wallets',
				description: 'List wallets, whose prepaid balances are drawn down during invoicing',
				method: 'GET',
				url: '/v2/wallets',
				output: 'list',
			}),
			operation({
				name: 'Get Settings',
				value: 'getSettings',
				action: 'Get wallet settings',
				description: 'Get the wallet settings of the account',
				method: 'GET',
				url: '/v1/wallets/settings',
			}),
			operation({
				name: 'Get Transactions',
				value: 'getTransactions',
				action: 'Get transactions of a wallet',
				description: 'List the loads, usages and refunds of a wallet',
				method: 'GET',
				url: '=/v1/wallets/{{$parameter.walletId}}/transactions',
				output: 'list',
			}),
			operation({
				name: 'Load',
				value: 'load',
				action: 'Load a wallet',
				description: 'Add free credits or paid funds to a wallet',
				method: 'POST',
				url: '=/v1/wallets/{{$parameter.walletId}}/load',
			}),
			operation({
				name: 'Revert Load',
				value: 'revertLoad',
				action: 'Revert a wallet load',
				description: 'Void the credit note of a wallet load and debit the loaded amount',
				method: 'POST',
				url: '=/v1/wallets/{{$parameter.walletId}}/transactions/{{$parameter.walletTransactionId}}/revert',
				output: 'success',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a wallet',
				description: 'Update the state and auto-load settings of a wallet',
				method: 'PUT',
				url: '=/v1/wallets/{{$parameter.walletId}}',
			}),
			operation({
				name: 'Update Settings',
				value: 'updateSettings',
				action: 'Update wallet settings',
				description: 'Update the wallet settings of the account',
				method: 'PATCH',
				url: '/v1/wallets/settings',
			}),
		],
		'get',
	),
	idParameter({
		name: 'walletId',
		displayName: 'Wallet ID',
		displayOptions: show(['get', 'getTransactions', 'load', 'revertLoad', 'update']),
	}),

	// Create
	customerBodyLocator(show(['create']), 'The customer who owns the wallet'),
	autoLoadEnabledParameter('create'),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [...autoLoadFields].sort(byDisplayName),
	},

	// Update
	autoLoadEnabledParameter('update'),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			...autoLoadFields,
			bodyOption({
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Paused', value: 'paused', description: 'The wallet is not debited' },
				],
				default: 'active',
			}),
		].sort(byDisplayName),
	},

	// Load
	{
		displayName: 'Load Type',
		name: 'loadType',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Free',
				value: 'free',
				description: 'Grant credits without collecting payment. Hyperline issues a credit note for them.',
			},
			{
				name: 'Paid',
				value: 'paid',
				description: 'Load money the customer paid',
			},
		],
		default: 'free',
		displayOptions: show(['load']),
		routing: { send: { type: 'body', property: 'type' } },
	},
	{
		displayName: 'Amount (Cents)',
		name: 'amount',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Free credits to add in cents, for example 5000 for 50.00',
		displayOptions: show(['load'], { loadType: ['free'] }),
		routing: { send: { type: 'body', property: 'amount' } },
	},
	{
		displayName: 'Paid Funds Source',
		name: 'paidSource',
		type: 'options',
		options: [
			{
				name: 'Existing Payment Transaction',
				value: 'transaction',
				description: 'Load the unallocated amount of a payment transaction',
			},
			{
				name: 'New Payment',
				value: 'newPayment',
				description: 'Record a new offline payment and load it',
			},
			{
				name: 'Paid Invoice Line Items',
				value: 'invoiceLineItems',
				description: 'Load the combined amount of line items from a paid invoice',
			},
		],
		default: 'invoiceLineItems',
		displayOptions: show(['load'], { loadType: ['paid'] }),
	},
	{
		...recordLocator({
			name: 'invoice',
			displayName: 'Invoice',
			searchListMethod: 'getInvoices',
			searchable: true,
			idPrefix: 'inv_',
			description: 'The paid invoice whose line items are loaded',
			displayOptions: show(['load'], { loadType: ['paid'], paidSource: ['invoiceLineItems'] }),
		}),
		routing: {
			send: {
				type: 'body',
				property: 'invoice_id',
				value: '={{ $parameter.invoice }}',
			},
		},
	},
	{
		displayName: 'Invoice Line Item IDs',
		name: 'invoiceLineItemIds',
		type: 'string',
		required: true,
		default: '',
		description: 'Comma-separated IDs of the paid invoice line items to load',
		displayOptions: show(['load'], { loadType: ['paid'], paidSource: ['invoiceLineItems'] }),
		routing: {
			send: {
				type: 'body',
				property: 'invoice_line_item_ids',
				value: '={{ $value.split(",").map((id) => id.trim()).filter((id) => id !== "") }}',
			},
		},
	},
	{
		...idParameter({
			name: 'transactionId',
			displayName: 'Payment Transaction ID',
			description: 'The payment transaction whose unallocated amount is loaded',
			displayOptions: show(['load'], { loadType: ['paid'], paidSource: ['transaction'] }),
		}),
		routing: { send: { type: 'body', property: 'transaction_id' } },
	},
	{
		displayName: 'Amount (Cents)',
		name: 'paymentAmount',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Amount paid in cents, for example 5000 for 50.00',
		displayOptions: show(['load'], { loadType: ['paid'], paidSource: ['newPayment'] }),
		routing: { send: { type: 'body', property: 'amount' } },
	},
	dateBodyOption({
		displayName: 'Payment Date',
		name: 'paymentDate',
		required: true,
		default: '={{ $now.toISO() }}',
		description: 'When the payment settled',
		displayOptions: show(['load'], { loadType: ['paid'], paidSource: ['newPayment'] }),
	}, 'date'),
	{
		displayName: 'Options',
		name: 'loadOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['load']),
		options: [
			bodyOption({
				displayName: 'Bank Account ID',
				name: 'bankAccountId',
				type: 'string',
				default: '',
				description: 'Bank account that received a new payment by bank transfer',
			}, 'bank_account_id'),
			bodyOption({
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Internal comment stored on the wallet transaction',
			}),
			{
				displayName: 'Draft Credit Note',
				name: 'draftCreditNote',
				type: 'boolean',
				default: false,
				description: 'Whether the credit note of a free load stays a draft',
				routing: {
					send: {
						type: 'body',
						property: 'document_status',
						value: '={{ $value ? "draft" : undefined }}',
					},
				},
			},
			bodyOption({
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				description: 'Reference stored on the transaction of a new payment',
			}),
		],
	},

	// Revert Load
	idParameter({
		name: 'walletTransactionId',
		displayName: 'Wallet Transaction ID',
		description: 'The credit transaction of the load to revert, from Get Transactions',
		displayOptions: show(['revertLoad']),
	}),

	// Update Settings
	{
		displayName: 'Update Fields',
		name: 'settingsFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['updateSettings']),
		options: [
			bodyOption({
				displayName: 'Allow Free Credits',
				name: 'allowFreeCredits',
				type: 'boolean',
				default: false,
				description: 'Whether wallets can be topped up with free amounts',
			}, 'allow_free_credits'),
			bodyOption({
				displayName: 'Allow Top-Up on Portal',
				name: 'allowTopupOnPortal',
				type: 'boolean',
				default: false,
				description: 'Whether customers can top up their wallet from the customer portal',
			}, 'allow_topup_on_portal'),
			bodyOption({
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				description:
					'Whether wallets are used at all. When off, wallets are not debited even when active and funded.',
			}),
			{
				displayName: 'Product IDs',
				name: 'productIds',
				type: 'string',
				default: '',
				placeholder: 'e.g. itm_3kXODDF42QXtnL, itm_8dKpQ2mXc7RtYb',
				description:
					'Comma-separated products wallets apply to. Leave empty to apply wallets to every invoice line item.',
				routing: {
					send: {
						type: 'body',
						property: 'product_ids',
						value: '={{ $value.split(",").map((id) => id.trim()).filter((id) => id !== "") }}',
					},
				},
			},
		],
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'offset', walletGetManyQueryParameters),
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
		],
	},

	// Get Transactions
	...paginationProperties(show(['getTransactions']), 'offset', walletTransactionsQueryParameters),
	{
		displayName: 'Filters',
		name: 'transactionFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getTransactions']),
		options: [
			queryOption({
				displayName: 'Amount (Cents)',
				name: 'amount',
				type: 'number',
				default: 0,
				description: 'Exact amount of the transaction in cents',
			}),
			queryOption({
				displayName: 'Comment Contains',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Case-insensitive match on the comment of the transaction',
			}),
			queryOption({
				displayName: 'Invoice ID',
				name: 'invoiceId',
				type: 'string',
				default: '',
			}, 'invoice_id'),
			queryOption({
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Credit (Free)', value: 'credit_free' },
					{ name: 'Credit (Paid)', value: 'credit_paid' },
					{ name: 'Debit', value: 'debit' },
				],
				default: 'credit_paid',
			}),
		],
	},
];
