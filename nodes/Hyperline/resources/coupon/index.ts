import type { INodeProperties } from 'n8n-workflow';
import {
	LIST_VALUE,
	bodyOption,
	idParameter,
	jsonBodyProperty,
	paginationProperties,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'coupon';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

/** Create and Update take the same body: Hyperline replaces the coupon on update. */
function couponFields(forOperation: 'create' | 'update'): INodeProperties[] {
	const showFor = (extra: Record<string, string[]> = {}) => ({
		show: { resource: [RESOURCE], operation: [forOperation], ...extra },
	});
	return [
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			required: true,
			default: '',
			displayOptions: showFor(),
			routing: { send: { type: 'body', property: 'name' } },
		},
		{
			displayName: 'Discount Type',
			name: 'type',
			type: 'options',
			required: true,
			options: [
				{
					name: 'Fixed Amount',
					value: 'amount',
					description: 'Takes a fixed amount off the total, excluding taxes',
				},
				{
					name: 'Percentage',
					value: 'percent',
					description: 'Takes a percentage off the amount of each product, excluding taxes',
				},
			],
			default: 'percent',
			displayOptions: showFor(),
			routing: { send: { type: 'body', property: 'type' } },
		},
		{
			displayName: 'Discount Percent',
			name: 'discountPercent',
			type: 'number',
			required: true,
			default: 10,
			typeOptions: { minValue: 0, maxValue: 100 },
			displayOptions: showFor({ type: ['percent'] }),
			routing: { send: { type: 'body', property: 'discount_percent' } },
		},
		{
			displayName: 'Discount Amount (Cents)',
			name: 'discountAmount',
			type: 'number',
			required: true,
			default: 0,
			description: 'Amount taken off in cents, for example 1000 for 10.00',
			displayOptions: showFor({ type: ['amount'] }),
			routing: { send: { type: 'body', property: 'discount_amount' } },
		},
		{
			displayName: 'Currency',
			name: 'currency',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. EUR',
			description: 'Three-letter ISO currency code of the discount amount',
			displayOptions: showFor({ type: ['amount'] }),
			routing: { send: { type: 'body', property: 'currency' } },
		},
		{
			displayName: forOperation === 'create' ? 'Additional Fields' : 'Update Fields',
			name: forOperation === 'create' ? 'additionalFields' : 'updateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: showFor(),
			options: [
				bodyOption({
					displayName: 'Description',
					name: 'description',
					type: 'string',
					default: '',
				}),
				bodyOption(
					{
						displayName: 'Duration Count',
						name: 'durationCount',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1 },
						description: 'Number of periods the coupon applies for. Used when Repeat is Duration.',
					},
					'duration.count',
				),
				bodyOption(
					{
						displayName: 'Duration Period',
						name: 'durationPeriod',
						type: 'options',
						options: [
							{ name: 'Days', value: 'days' },
							{ name: 'Months', value: 'months' },
							{ name: 'Weeks', value: 'weeks' },
							{ name: 'Years', value: 'years' },
						],
						default: 'months',
						description: 'Period unit the coupon applies for. Used when Repeat is Duration.',
					},
					'duration.period',
				),
				bodyOption(
					{
						displayName: 'Expiration Date',
						name: 'expirationDate',
						type: 'dateTime',
						default: '',
						description: 'After this date the coupon can no longer be applied',
					},
					'expiration_date',
				),
				{
					displayName: 'Product IDs',
					name: 'productIds',
					type: 'string',
					default: '',
					placeholder: 'e.g. itm_3kXODDF42QXtnL, itm_8dKpQ2mXc7RtYb',
					description: 'Comma-separated products the coupon is scoped to, read together with Product Scope',
					routing: {
						send: {
							type: 'body',
							property: 'product_ids',
							value: LIST_VALUE,
						},
					},
				},
				bodyOption(
					{
						displayName: 'Product Scope',
						name: 'productScope',
						type: 'options',
						options: [
							{
								name: 'All Products',
								value: 'all',
								description: 'Discounts every product. Product IDs must be empty.',
							},
							{
								name: 'Exclude Products',
								value: 'exclude',
								description: 'Discounts every product except the listed ones',
							},
							{
								name: 'Include Products',
								value: 'include',
								description: 'Discounts only the listed products',
							},
						],
						default: 'all',
						description:
							'Which products the coupon discounts. When unset, Hyperline infers it from Product IDs.',
					},
					'product_scope',
				),
				bodyOption(
					{
						displayName: 'Redemption Limit',
						name: 'redemptionLimit',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1 },
						description: 'Maximum number of subscriptions the coupon can be applied to',
					},
					'redemption_limit',
				),
				bodyOption({
					displayName: 'Repeat',
					name: 'repeat',
					type: 'options',
					options: [
						{
							name: 'Duration',
							value: 'duration',
							description: 'Applies for the set Duration Count and Duration Period',
						},
						{ name: 'Forever', value: 'forever' },
						{ name: 'Once', value: 'once' },
					],
					default: 'once',
					description:
						'Default repeat behaviour when the coupon is attached to a subscription. Can be overridden when attaching.',
				}),
			],
		},
		jsonBodyProperty(
			showFor(),
			'Other coupon fields from the Hyperline API reference, such as properties (metadata). Fields set above take precedence.',
			'{\n  "properties": { "campaign": "spring-sale" }\n}',
		),
	];
}

export const couponDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a coupon',
				description: 'Create a percentage or fixed amount coupon',
				method: 'POST',
				url: '/v1/coupons',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a coupon',
				description: 'Permanently delete a coupon',
				method: 'DELETE',
				url: '=/v1/coupons/{{$parameter.couponId}}',
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a coupon',
				description: 'Get a coupon with its discount rules and redemption count',
				method: 'GET',
				url: '=/v1/coupons/{{$parameter.couponId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many coupons',
				description: 'List coupons',
				method: 'GET',
				url: '/v1/coupons',
				output: 'list',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a coupon',
				description: 'Replace the name and discount rules of a coupon',
				method: 'PUT',
				url: '=/v1/coupons/{{$parameter.couponId}}',
			}),
		],
		'get',
	),
	idParameter({
		name: 'couponId',
		displayName: 'Coupon ID',
		displayOptions: show(['delete', 'get', 'update']),
	}),

	...couponFields('create'),
	...couponFields('update'),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset'),
];
