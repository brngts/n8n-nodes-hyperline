import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	byDisplayName,
	idParameter,
	paginationProperties,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'priceBook';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const splitIds = '={{ $value.split(",").map((id) => id.trim()).filter((id) => id !== "") }}';

/** Optional fields shared by Create and Update. */
function priceBookFields(): INodeProperties[] {
	return [
		bodyOption({
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
		}),
		{
			displayName: 'User Role IDs',
			name: 'userRoleIds',
			type: 'string',
			default: '',
			description: 'Comma-separated IDs of the user roles that can use the price book',
			routing: {
				send: {
					type: 'body',
					property: 'user_role_ids',
					value: splitIds,
				},
			},
		},
	];
}

export const priceBookDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Add Products',
				value: 'addProducts',
				action: 'Add products to a price book',
				description: 'Add catalog products to a price book',
				method: 'POST',
				url: '=/v1/price-books/{{$parameter.priceBookId}}/products',
				output: 'success',
			}),
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a price book',
				description: 'Create a price book that holds its own prices for catalog products',
				method: 'POST',
				url: '/v1/price-books',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a price book',
				description: 'Permanently delete a price book',
				method: 'DELETE',
				url: '=/v1/price-books/{{$parameter.priceBookId}}',
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a price book',
				description: 'Get a price book by ID',
				method: 'GET',
				url: '=/v1/price-books/{{$parameter.priceBookId}}',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many price books',
				description: 'List price books',
				method: 'GET',
				url: '/v1/price-books',
				output: 'list',
			}),
			operation({
				name: 'Remove Product',
				value: 'removeProduct',
				action: 'Remove a product from a price book',
				description: 'Remove a catalog product from a price book',
				method: 'DELETE',
				url: '=/v1/price-books/{{$parameter.priceBookId}}/products/{{$parameter.product}}',
				output: 'success',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a price book',
				description: 'Update the name, description or user roles of a price book',
				method: 'PUT',
				url: '=/v1/price-books/{{$parameter.priceBookId}}',
			}),
		],
		'get',
	),
	idParameter({
		name: 'priceBookId',
		displayName: 'Price Book ID',
		displayOptions: show(['addProducts', 'delete', 'get', 'removeProduct', 'update']),
	}),

	// Add Products
	{
		displayName: 'Product IDs',
		name: 'productIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. itm_3kXODDF42QXtnL, itm_8dKpQ2mXc7RtYb',
		description: 'Comma-separated IDs of the products to add',
		displayOptions: show(['addProducts']),
		routing: {
			send: {
				type: 'body',
				property: 'product_ids',
				value: splitIds,
			},
		},
	},

	// Remove Product
	recordLocator({
		name: 'product',
		displayName: 'Product',
		searchListMethod: 'getProducts',
		searchable: true,
		idPrefix: 'itm_',
		description: 'The product to remove from the price book',
		displayOptions: show(['removeProduct']),
	}),

	// Create
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: priceBookFields(),
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
			...priceBookFields(),
			bodyOption({
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			}),
		].sort(byDisplayName),
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'offset'),
];
