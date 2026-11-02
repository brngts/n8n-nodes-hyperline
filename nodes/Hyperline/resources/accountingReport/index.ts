import type { INodeProperties } from 'n8n-workflow';
import {
	LIST_VALUE,
	bodyOption,
	byDisplayName,
	idParameter,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { DATE_VALUE } from '../../shared/dates';

const RESOURCE = 'accountingReport';

const REPORT_OPERATIONS = ['exportGeneralLedger', 'exportIncomeStatement'];

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

/** Options both reports accept. */
const sharedReportOptions: INodeProperties[] = [
	bodyOption({
		displayName: 'Include Reversed Entries',
		name: 'includeReversed',
		type: 'boolean',
		default: false,
		description: 'Whether reversed journal entries are included',
	}, 'include_reversed'),
	bodyOption({
		displayName: 'Invoicing Entity ID',
		name: 'invoicingEntityId',
		type: 'string',
		default: '',
		description: 'Only report on this invoicing entity',
	}, 'invoicing_entity_id'),
	bodyOption({
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Posted', value: 'posted' },
		],
		default: 'posted',
		description: 'Journal entry statuses to include. Defaults to posted entries only.',
	}),
];

/** Options only the general ledger accepts. */
const generalLedgerOptions: INodeProperties[] = [
	{
		displayName: 'Account IDs',
		name: 'accountIds',
		type: 'string',
		default: '',
		description: 'Comma-separated ledger accounts to include',
		routing: {
			send: {
				type: 'body',
				property: 'account_ids',
				value: LIST_VALUE,
			},
		},
	},
	bodyOption({
		displayName: 'Account Types',
		name: 'accountTypes',
		type: 'multiOptions',
		options: [
			{ name: 'Asset', value: 'asset' },
			{ name: 'Contra Asset', value: 'contra_asset' },
			{ name: 'Contra Liability', value: 'contra_liability' },
			{ name: 'Contra Revenue', value: 'contra_revenue' },
			{ name: 'Equity', value: 'equity' },
			{ name: 'Expense', value: 'expense' },
			{ name: 'Liability', value: 'liability' },
			{ name: 'Revenue', value: 'revenue' },
		],
		default: [],
		description: 'Only include ledger accounts of these types',
	}, 'account_types'),
];

export const accountingReportDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Export General Ledger',
				value: 'exportGeneralLedger',
				action: 'Export a general ledger',
				description: 'Queue a general ledger export in XLSX for a ledger and period',
				method: 'POST',
				url: '/v1/accounting/general-ledger/export',
			}),
			operation({
				name: 'Export Income Statement',
				value: 'exportIncomeStatement',
				action: 'Export an income statement',
				description: 'Queue an income statement export in XLSX for a ledger and period',
				method: 'POST',
				url: '/v1/accounting/income-statement/export',
			}),
		],
		'exportIncomeStatement',
	),
	{
		...idParameter({
			name: 'ledgerId',
			displayName: 'Ledger ID',
			displayOptions: show(REPORT_OPERATIONS),
		}),
		routing: { send: { type: 'body', property: 'ledger_id' } },
	},
	{
		displayName: 'Period From',
		name: 'periodFrom',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'First day of the reporting period, included',
		displayOptions: show(REPORT_OPERATIONS),
		routing: { send: { type: 'body', property: 'period_from', value: DATE_VALUE } },
	},
	{
		displayName: 'Period To',
		name: 'periodTo',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'Last day of the reporting period, included',
		displayOptions: show(REPORT_OPERATIONS),
		routing: { send: { type: 'body', property: 'period_to', value: DATE_VALUE } },
	},
	{
		displayName: 'Options',
		name: 'incomeStatementOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['exportIncomeStatement']),
		options: sharedReportOptions,
	},
	{
		displayName: 'Options',
		name: 'generalLedgerOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['exportGeneralLedger']),
		options: [...sharedReportOptions, ...generalLedgerOptions].sort(byDisplayName),
	},
];
