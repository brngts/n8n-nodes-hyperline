import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';
import {
	byDisplayName,
	idParameter,
	paginationProperties,
	queryOption,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';
import { DATE_VALUE } from '../aggregator/dates';

const RESOURCE = 'revenueRecognition';

const show = (operations: string[], extra: IDisplayOptions['show'] = {}) => ({
	show: { resource: [RESOURCE], operation: operations, ...extra },
});

const scheduleGetManyQueryParameters = ['invoice_id', 'invoicing_entity_id'];

const waterfallCellQueryParameters = [
	'ledger_id',
	'cell_type',
	'booked_month',
	'year',
	'recognition_month',
	'status',
	'customer_id__in',
	'product_id__in',
	'search',
];

/** Trims a comma-separated list such as `cus_1, cus_2` into the `cus_1,cus_2` Hyperline expects. */
const COMMA_SEPARATED_VALUE =
	'={{ $value.split(",").map((id) => id.trim()).filter((id) => id !== "").join(",") || undefined }}';

function ledgerIdParameter(operations: string[], type: 'query' | 'body'): INodeProperties {
	return {
		...idParameter({
			name: 'ledgerId',
			displayName: 'Ledger ID',
			displayOptions: show(operations),
		}),
		routing: { send: { type, property: 'ledger_id' } },
	};
}

function yearParameter(displayOptions: IDisplayOptions, type: 'query' | 'body'): INodeProperties {
	return {
		displayName: 'Year',
		name: 'year',
		type: 'number',
		required: true,
		default: 2026,
		typeOptions: { minValue: 2000, maxValue: 2100, numberPrecision: 0 },
		description: 'Calendar year the revenue was booked in',
		displayOptions,
		routing: { send: { type, property: 'year' } },
	};
}

/** Filters the waterfall and its cells accept. */
const waterfallFilters: INodeProperties[] = [
	{
		displayName: 'Customer IDs',
		name: 'customerIds',
		type: 'string',
		default: '',
		placeholder: 'e.g. cus_DKL4Xcb5VSa8CQ, cus_8dKpQ2mXc7RtYb',
		description: 'Comma-separated customers to include',
		routing: { send: { type: 'query', property: 'customer_id__in', value: COMMA_SEPARATED_VALUE } },
	},
	{
		displayName: 'Product IDs',
		name: 'productIds',
		type: 'string',
		default: '',
		placeholder: 'e.g. itm_3kXODDF42QXtnL, itm_8dKpQ2mXc7RtYb',
		description: 'Comma-separated products to include',
		routing: { send: { type: 'query', property: 'product_id__in', value: COMMA_SEPARATED_VALUE } },
	},
	queryOption({
		displayName: 'Search',
		name: 'search',
		type: 'string',
		default: '',
		description: 'Search by invoice ID or number, customer name or ID, or subscription ID',
	}),
];

export const revenueRecognitionDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Export Recognized Summary',
				value: 'exportRecognizedSummary',
				action: 'Export a recognized revenue summary',
				description: 'Queue a summary of recognized revenue in XLSX or CSV for a month range',
				method: 'POST',
				url: '/v1/accounting/revrec/recognized-summary/export',
			}),
			operation({
				name: 'Export Waterfall',
				value: 'exportWaterfall',
				action: 'Export a revenue waterfall',
				description: 'Queue a waterfall export in XLSX for a ledger and year',
				method: 'POST',
				url: '/v1/accounting/revrec/waterfall/export',
			}),
			operation({
				name: 'Get Many Schedules',
				value: 'getManySchedules',
				action: 'Get many revenue recognition schedules',
				description: 'List revenue recognition schedules with their slices',
				method: 'GET',
				url: '/v1/accounting/revrec/schedules',
				output: 'list',
			}),
			operation({
				name: 'Get Schedule',
				value: 'getSchedule',
				action: 'Get a revenue recognition schedule',
				description: 'Get a revenue recognition schedule with its slices',
				method: 'GET',
				url: '=/v1/accounting/revrec/schedules/{{$parameter.scheduleId}}',
			}),
			operation({
				name: 'Get Schedule Adjustments',
				value: 'getScheduleAdjustments',
				action: 'Get the adjustments of a schedule',
				description: 'List the audit trail of manual adjustments to a schedule',
				method: 'GET',
				url: '=/v1/accounting/revrec/schedules/{{$parameter.scheduleId}}/adjustments',
				output: 'list',
			}),
			operation({
				name: 'Get Slice',
				value: 'getSlice',
				action: 'Get a revenue recognition slice',
				description: 'Get a revenue recognition slice by ID',
				method: 'GET',
				url: '=/v1/accounting/revrec/slices/{{$parameter.sliceId}}',
			}),
			operation({
				name: 'Get Unbilled Revenue',
				value: 'getUnbilledRevenue',
				action: 'Get the unbilled revenue of a subscription',
				description: 'Get the revenue accrued on the current open invoice of a subscription',
				method: 'GET',
				url: '/v1/accounting/revrec/unbilled',
			}),
			operation({
				name: 'Get Waterfall',
				value: 'getWaterfall',
				action: 'Get a revenue waterfall',
				description: 'Get the booked by recognition month matrix of a ledger for a year',
				method: 'GET',
				url: '/v1/accounting/revrec/waterfall',
			}),
			operation({
				name: 'Get Waterfall Cell',
				value: 'getWaterfallCell',
				action: 'Get a waterfall cell',
				description: 'List the schedules and slices contributing to a waterfall cell',
				method: 'GET',
				url: '/v1/accounting/revrec/waterfall/cell',
				output: 'list',
			}),
			operation({
				name: 'Preview Schedule Reshape',
				value: 'previewReshape',
				action: 'Preview a schedule reshape',
				description: 'Preview the plan of a schedule reshape without changing anything',
				method: 'POST',
				url: '=/v1/accounting/revrec/schedules/{{$parameter.scheduleId}}/reshape/preview',
			}),
			operation({
				name: 'Reshape Schedule',
				value: 'reshapeSchedule',
				action: 'Reshape a schedule',
				description: 'Recognize an amount now and optionally spread the rest over a new window',
				method: 'POST',
				url: '=/v1/accounting/revrec/schedules/{{$parameter.scheduleId}}/reshape',
			}),
		],
		'getWaterfall',
	),
	idParameter({
		name: 'scheduleId',
		displayName: 'Schedule ID',
		displayOptions: show(['getSchedule', 'getScheduleAdjustments', 'previewReshape', 'reshapeSchedule']),
	}),
	idParameter({
		name: 'sliceId',
		displayName: 'Slice ID',
		displayOptions: show(['getSlice']),
	}),

	// Waterfall
	ledgerIdParameter(['getWaterfall', 'getWaterfallCell'], 'query'),
	ledgerIdParameter(['exportRecognizedSummary', 'exportWaterfall'], 'body'),
	yearParameter(show(['getWaterfall']), 'query'),
	yearParameter(show(['exportWaterfall']), 'body'),
	{
		displayName: 'Filters',
		name: 'waterfallFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getWaterfall']),
		options: waterfallFilters,
	},

	// Waterfall cell
	{
		displayName: 'Cell Type',
		name: 'cellType',
		type: 'options',
		required: true,
		options: [
			{ name: 'Booked', value: 'booked' },
			{ name: 'Recognition', value: 'recognition' },
			{ name: 'Remaining', value: 'remaining' },
		],
		default: 'recognition',
		description: 'Category of the waterfall cell',
		displayOptions: show(['getWaterfallCell']),
		routing: { send: { type: 'query', property: 'cell_type' } },
	},
	{
		displayName: 'Booked Period',
		name: 'bookedPeriod',
		type: 'options',
		options: [
			{ name: 'Month', value: 'month', description: 'Revenue booked in one month' },
			{ name: 'Year', value: 'year', description: 'Revenue booked in a whole year' },
		],
		default: 'month',
		description: 'Whether the cell covers revenue booked in one month or in a whole year',
		displayOptions: show(['getWaterfallCell']),
	},
	{
		displayName: 'Booked Month',
		name: 'bookedMonth',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 2026-01',
		description: 'Month the revenue was booked in, formatted YYYY-MM',
		displayOptions: show(['getWaterfallCell'], { bookedPeriod: ['month'] }),
		routing: { send: { type: 'query', property: 'booked_month' } },
	},
	yearParameter(show(['getWaterfallCell'], { bookedPeriod: ['year'] }), 'query'),
	...paginationProperties(show(['getWaterfallCell']), 'offset', waterfallCellQueryParameters),
	{
		displayName: 'Filters',
		name: 'waterfallCellFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getWaterfallCell']),
		options: [
			...waterfallFilters,
			queryOption({
				displayName: 'Recognition Month',
				name: 'recognitionMonth',
				type: 'string',
				default: '',
				placeholder: 'e.g. 2026-03',
				description: 'Month the revenue is recognized in, formatted YYYY-MM',
			}, 'recognition_month'),
			queryOption({
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Pending', value: 'pending' },
					{ name: 'Recognized', value: 'recognized' },
					{ name: 'Reversed', value: 'reversed' },
				],
				default: 'recognized',
				description: 'Recognition status of the slices',
			}),
		].sort(byDisplayName),
	},

	// Export Recognized Summary
	{
		displayName: 'Month From',
		name: 'monthFrom',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 2026-01',
		description: 'First recognition month to include, formatted YYYY-MM',
		displayOptions: show(['exportRecognizedSummary']),
		routing: { send: { type: 'body', property: 'month_from' } },
	},
	{
		displayName: 'Month To',
		name: 'monthTo',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 2026-12',
		description: 'Last recognition month to include, formatted YYYY-MM',
		displayOptions: show(['exportRecognizedSummary']),
		routing: { send: { type: 'body', property: 'month_to' } },
	},
	{
		displayName: 'Options',
		name: 'summaryOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['exportRecognizedSummary']),
		options: [
			{
				displayName: 'File Type',
				name: 'fileType',
				type: 'options',
				options: [
					{ name: 'CSV', value: 'csv' },
					{ name: 'XLSX', value: 'xlsx' },
				],
				default: 'xlsx',
				routing: { send: { type: 'body', property: 'file_type' } },
			},
		],
	},

	// Get Unbilled Revenue
	{
		...recordLocator({
			name: 'subscription',
			displayName: 'Subscription',
			searchListMethod: 'getSubscriptions',
			searchable: false,
			idPrefix: 'sub_',
			displayOptions: show(['getUnbilledRevenue']),
		}),
		routing: {
			send: {
				type: 'query',
				property: 'subscription_id',
				value: '={{ $parameter.subscription }}',
			},
		},
	},

	// Get Many Schedules
	...paginationProperties(show(['getManySchedules']), 'offset', scheduleGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'scheduleFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getManySchedules']),
		options: [
			queryOption({
				displayName: 'Invoice ID',
				name: 'invoiceId',
				type: 'string',
				default: '',
				placeholder: 'e.g. inv_DKL4Xcb5VSa8CQ',
			}, 'invoice_id'),
			queryOption({
				displayName: 'Invoicing Entity ID',
				name: 'invoicingEntityId',
				type: 'string',
				default: '',
			}, 'invoicing_entity_id'),
		],
	},

	// Get Schedule Adjustments
	...paginationProperties(show(['getScheduleAdjustments']), 'none'),

	// Reshape and Preview Schedule Reshape
	{
		displayName: 'Recognize Now Amount (Cents)',
		name: 'recognizeNowAmount',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Amount to recognize immediately, in cents of the ledger currency',
		displayOptions: show(['previewReshape', 'reshapeSchedule']),
		routing: { send: { type: 'body', property: 'recognize_now_amount' } },
	},
	{
		displayName: 'Reason Code',
		name: 'reasonCode',
		type: 'options',
		required: true,
		options: [
			{ name: 'Obligation Satisfied Early', value: 'obligation_satisfied_early' },
			{ name: 'Other', value: 'other' },
			{ name: 'Renegotiated Delivery', value: 'renegotiated_delivery' },
			{ name: 'Service Period Change', value: 'service_period_change' },
			{ name: 'Setup Error', value: 'setup_error' },
		],
		default: 'service_period_change',
		description: 'Why the schedule is adjusted',
		displayOptions: show(['reshapeSchedule']),
		routing: { send: { type: 'body', property: 'reason_code' } },
	},
	{
		displayName: 'Reason Detail',
		name: 'reasonDetail',
		type: 'string',
		required: true,
		default: '',
		description: 'Explanation of the adjustment',
		displayOptions: show(['reshapeSchedule'], { reasonCode: ['other'] }),
		routing: { send: { type: 'body', property: 'reason_detail' } },
	},
	{
		displayName: 'Options',
		name: 'reshapeOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		description: 'Set both window dates to spread the remaining amount over a new window',
		displayOptions: show(['previewReshape', 'reshapeSchedule']),
		options: [
			{
				displayName: 'Window End Date',
				name: 'windowEndDate',
				type: 'dateTime',
				default: '',
				description: 'Last day of the new recognition window, included',
				routing: { send: { type: 'body', property: 'window.end_date', value: DATE_VALUE } },
			},
			{
				displayName: 'Window Start Date',
				name: 'windowStartDate',
				type: 'dateTime',
				default: '',
				description: 'First day of the new recognition window, included',
				routing: { send: { type: 'body', property: 'window.start_date', value: DATE_VALUE } },
			},
		],
	},
];
