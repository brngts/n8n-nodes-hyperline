import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	byDisplayName,
	idParameter,
	paginationProperties,
	queryOption,
} from '../../shared/descriptions';
import { UTC_DATE_TIME_VALUE } from '../../shared/dates';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'promotionCode';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const getManyQueryParameters = ['coupon_id'];

/** Restrictions and limits shared by Create and Update. Update cannot move a code to another coupon. */
const promotionCodeFields: INodeProperties[] = [
	bodyOption(
		{
			displayName: 'Current Redemptions',
			name: 'currentRedemptions',
			type: 'number',
			default: 0,
			typeOptions: { minValue: 0 },
			description: 'Number of times the code has already been redeemed',
		},
		'current_redemptions',
	),
	bodyOption(
		{
			displayName: 'Customer ID',
			name: 'customerId',
			type: 'string',
			default: '',
			placeholder: 'e.g. cus_DKL4Xcb5VSa8CQ',
			description: 'Only this customer can use the code',
		},
		'customer_id',
	),
	bodyOption(
		{
			displayName: 'Duration Count',
			name: 'durationCount',
			type: 'number',
			default: 1,
			typeOptions: { minValue: 1 },
			description: 'Number of periods the discount applies for. Leave unset when Duration Period is Once.',
		},
		'duration_count',
	),
	bodyOption(
		{
			displayName: 'Duration Period',
			name: 'durationPeriod',
			type: 'options',
			options: [
				{ name: 'Days', value: 'days' },
				{ name: 'Months', value: 'months' },
				{ name: 'Once', value: 'once' },
				{ name: 'Weeks', value: 'weeks' },
				{ name: 'Years', value: 'years' },
			],
			default: 'once',
			description: 'Period unit the discount applies for on the subscription',
		},
		'duration_period',
	),
	{
		displayName: 'Expires At',
		name: 'expiresAt',
		type: 'dateTime',
		default: '',
		description: 'After this date the code can no longer be used',
		routing: { send: { type: 'body', property: 'expires_at', value: UTC_DATE_TIME_VALUE } },
	},
	bodyOption(
		{
			displayName: 'Max Redemptions',
			name: 'maxRedemptions',
			type: 'number',
			default: 1,
			typeOptions: { minValue: 1 },
			description: 'How many times the code can be redeemed, independent of the redemption limit of the coupon',
		},
		'max_redemptions',
	),
	bodyOption(
		{
			displayName: 'Only for First Time Orders',
			name: 'onlyForFirstTimeOrder',
			type: 'boolean',
			default: false,
			description: 'Whether the code can only be used on a first order',
		},
		'only_for_first_time_order',
	),
	bodyOption(
		{
			displayName: 'Plan ID',
			name: 'planId',
			type: 'string',
			default: '',
			description: 'Only subscriptions with this plan can use the code',
		},
		'plan_id',
	),
	bodyOption(
		{
			displayName: 'Product ID',
			name: 'productId',
			type: 'string',
			default: '',
			placeholder: 'e.g. itm_3kXODDF42QXtnL',
			description: 'Only subscriptions with this product can use the code',
		},
		'product_id',
	),
];

export const promotionCodeDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a promotion code',
				description: 'Create a shareable code that applies an existing coupon',
				method: 'POST',
				url: '/v1/promotion-codes',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a promotion code',
				description: 'Permanently delete a promotion code',
				method: 'DELETE',
				url: '=/v1/promotion-codes/{{$parameter.promotionCodeId}}',
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a promotion code',
				description: 'Get a promotion code with its coupon',
				method: 'GET',
				url: '=/v1/promotion-codes/{{$parameter.promotionCodeId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many promotion codes',
				description: 'List promotion codes',
				method: 'GET',
				url: '/v1/promotion-codes',
				output: 'list',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a promotion code',
				description: 'Update the code, restrictions and limits of a promotion code',
				method: 'PATCH',
				url: '=/v1/promotion-codes/{{$parameter.promotionCodeId}}',
			}),
		],
		'get',
	),
	idParameter({
		name: 'promotionCodeId',
		displayName: 'Promotion Code ID',
		displayOptions: show(['delete', 'get', 'update']),
	}),

	// Create
	{
		displayName: 'Code',
		name: 'code',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. SPRING25',
		description: 'The code customers enter to get the discount',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'code' } },
	},
	{
		...idParameter({
			name: 'couponId',
			displayName: 'Coupon ID',
			description: 'The coupon whose discount the code applies',
			displayOptions: show(['create']),
		}),
		routing: { send: { type: 'body', property: 'coupon_id' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: promotionCodeFields,
	},

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			...promotionCodeFields,
			bodyOption({
				displayName: 'Code',
				name: 'code',
				type: 'string',
				default: '',
				description: 'The code customers enter to get the discount',
			}),
		].sort(byDisplayName),
	},

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
					displayName: 'Coupon ID',
					name: 'couponId',
					type: 'string',
					default: '',
					description: 'Only promotion codes of this coupon',
				},
				'coupon_id',
			),
		],
	},
];
