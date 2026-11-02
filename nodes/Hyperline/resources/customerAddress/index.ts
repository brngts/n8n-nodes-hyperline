import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	idParameter,
	paginationProperties,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'customerAddress';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const ADDRESSES_URL = '=/v1/customers/{{$parameter.customer}}/addresses';

/** Address fields shared by Create and Update. */
function addressFields(forUpdate: boolean): INodeProperties[] {
	return [
		bodyOption({
			displayName: 'Address Line 1',
			name: 'line1',
			type: 'string',
			default: '',
		}),
		bodyOption({
			displayName: 'Address Line 2',
			name: 'line2',
			type: 'string',
			default: '',
		}),
		bodyOption({
			displayName: 'City',
			name: 'city',
			type: 'string',
			default: '',
		}),
		bodyOption({
			displayName: 'Country',
			name: 'country',
			type: 'string',
			default: '',
			placeholder: 'e.g. DE',
			description: 'Two-letter ISO country code',
		}),
		bodyOption({
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			description: 'Name of the address, such as the site or recipient it ships to',
		}),
		bodyOption({
			displayName: 'State',
			name: 'state',
			type: 'string',
			default: '',
			placeholder: 'e.g. CA',
			description: 'Two-letter state code. Only used for US addresses.',
		}),
		bodyOption({
			displayName: 'Tax ID',
			name: 'taxId',
			type: 'string',
			default: '',
			description: forUpdate
				? 'Tax ID override of a shipping address. Leave empty to use the tax ID of the customer again. Billing addresses cannot have one.'
				: 'Tax ID override for this shipping address. Leave unset to use the tax ID of the customer.',
		}, 'tax_id'),
		bodyOption({
			displayName: 'ZIP Code',
			name: 'zip',
			type: 'string',
			default: '',
		}),
	];
}

export const customerAddressDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create',
				value: 'create',
				action: 'Create a customer address',
				description:
					'Add a shipping address to a customer. The billing address is managed on the customer.',
				method: 'POST',
				url: ADDRESSES_URL,
				// Only shipping addresses can be created through this endpoint
				request: { body: { type: 'shipping' } },
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a customer address',
				description:
					'Delete an address of a customer. Select another shipping destination before deleting the default one.',
				method: 'DELETE',
				url: `${ADDRESSES_URL}/{{$parameter.addressId}}`,
				output: 'success',
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many customer addresses',
				description: 'List the billing address and the shipping addresses of a customer',
				method: 'GET',
				url: ADDRESSES_URL,
				output: 'list',
			}),
			operation({
				name: 'Update',
				value: 'update',
				action: 'Update a customer address',
				description:
					'Update the billing or a shipping address of a customer. Only the fields you set are changed.',
				method: 'PATCH',
				url: `${ADDRESSES_URL}/{{$parameter.addressId}}`,
			}),
		],
		'getAll',
	),
	recordLocator({
		name: 'customer',
		displayName: 'Customer',
		searchListMethod: 'getCustomers',
		searchable: true,
		idPrefix: 'cus_',
		description: 'The customer the address belongs to',
		displayOptions: show(['create', 'delete', 'getAll', 'update']),
	}),
	idParameter({
		name: 'addressId',
		displayName: 'Address ID',
		description: 'ID of the address, as returned by Get Many',
		displayOptions: show(['delete', 'update']),
	}),

	// Create
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: addressFields(false),
	},

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: addressFields(true),
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'none'),
];
