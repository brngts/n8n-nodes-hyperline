import type { INodeProperties } from 'n8n-workflow';
import { binaryPropertyName, idParameter, paginationProperties } from '../../shared/descriptions';
import { DOWNLOAD_REQUEST, operation, operationSelector } from '../../shared/operations';
import { binaryDownload } from '../../shared/postReceive';

const RESOURCE = 'export';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const exportDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create an export',
				description: 'Start preparing a data export, such as all customers or outstanding invoices',
				method: 'POST',
				url: '/v1/exports',
			}),
			operation({
				name: 'Download',
				value: 'download',
				action: 'Download an export',
				description: 'Download the file of a completed export',
				method: 'GET',
				url: '=/v2/exports/{{$parameter.exportId}}/download',
				output: [binaryDownload({ fileNamePrefix: 'export', idParameter: 'exportId' })],
				request: DOWNLOAD_REQUEST,
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get an export',
				description: 'Check whether an export is pending, processing or completed',
				method: 'GET',
				url: '=/v1/exports/{{$parameter.exportId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many exports',
				description: 'List data exports',
				method: 'GET',
				url: '/v1/exports',
				output: 'list',
			}),
		],
		'get',
	),
	idParameter({
		name: 'exportId',
		displayName: 'Export ID',
		displayOptions: show(['download', 'get']),
	}),

	// Create
	{
		displayName: 'Export Type',
		name: 'name',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Aged Balances',
				value: 'aged_balances',
				description: 'Balances at 30, 60 and 90+ days for all customers',
			},
			{ name: 'All Customers', value: 'all_customers' },
			{
				name: 'All Subscriptions',
				value: 'all_subscriptions',
				description: 'Active, pending and cancelled subscriptions',
			},
			{
				name: 'Credit Balances',
				value: 'credit_balances',
				description: 'Monthly credit balance roll-forward per customer and credit type',
			},
			{
				name: 'Detailed Revenue',
				value: 'detailed_revenue',
				description: 'Booked revenue per customer and product, month over month',
			},
			{ name: 'Draft Invoices', value: 'draft_invoices' },
			{
				name: 'Line by Line Revenue',
				value: 'line_by_line_revenue',
				description: 'All invoice line items in chronological order',
			},
			{
				name: 'Live Subscriptions',
				value: 'live_subscriptions',
				description: 'Active subscriptions, line by line',
			},
			{ name: 'Open Invoices', value: 'open_invoices' },
			{ name: 'Outstanding Invoices', value: 'outstanding_invoices' },
			{ name: 'Renewals', value: 'renewals' },
			{
				name: 'Revenue per Country',
				value: 'revenue_per_country',
				description: 'Revenue, tax and invoice count per country',
			},
			{
				name: 'Revenue per Line Item Name',
				value: 'revenue_per_line_item_name',
				description: 'Revenue per invoice line item name, month over month',
			},
			{
				name: 'Revenue per Plan',
				value: 'revenue_per_plan',
				description: 'Revenue per plan, month over month',
			},
			{
				name: 'Revenue per Product',
				value: 'revenue_per_product',
				description: 'Revenue per product, month over month',
			},
		],
		default: 'all_customers',
		description: 'Which data to export',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'File Type',
		name: 'fileType',
		type: 'options',
		required: true,
		options: [
			{ name: 'CSV', value: 'csv' },
			{ name: 'JSON', value: 'json' },
			{ name: 'XLSX', value: 'xlsx' },
		],
		default: 'csv',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'file_type' } },
	},

	// Download
	binaryPropertyName(show(['download']), 'file'),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset'),
];
