import type { INodeProperties } from 'n8n-workflow';
import { paginationProperties, queryOption, recordLocator } from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'product';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

export const productGetManyQueryParameters = ['status', 'name__contains', 'type', 'price_book_id'];

export const productDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a product',
				description: 'Get a catalog product and its price configurations',
				method: 'GET',
				url: '=/v1/products/{{$parameter.product}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many products',
				description: 'List catalog products',
				method: 'GET',
				url: '/v1/products',
				output: 'list',
			}),
		],
		'getAll',
	),
	recordLocator({
		name: 'product',
		displayName: 'Product',
		searchListMethod: 'getProducts',
		searchable: true,
		idPrefix: 'itm_',
		displayOptions: show(['get']),
	}),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset', productGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'Name Contains',
				name: 'nameContains',
				type: 'string',
				default: '',
			}, 'name__contains'),
			queryOption({
				displayName: 'Price Book ID',
				name: 'priceBookId',
				type: 'string',
				default: '',
				description: 'Return prices from this price book instead of the default catalog',
			}, 'price_book_id'),
			queryOption({
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'All', value: 'all' },
					{ name: 'Archived', value: 'archived' },
				],
				default: 'active',
			}),
			queryOption({
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				placeholder: 'e.g. flat_fee',
				description: 'Product type, such as flat_fee, seat, dynamic or credit',
			}),
		],
	},
];
