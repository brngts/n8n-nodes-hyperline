import type { INodeProperties } from 'n8n-workflow';
import {
	bodyOption,
	idParameter,
	paginationProperties,
	recordLocator,
} from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'customerPaymentMethod';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const PAYMENT_METHODS_URL = '=/v1/customers/{{$parameter.customer}}/payment-methods';

export const customerPaymentMethodDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a payment method',
				description: 'Permanently remove a payment method from a customer',
				method: 'DELETE',
				url: `${PAYMENT_METHODS_URL}/{{$parameter.paymentMethodId}}`,
				output: 'success',
			}),
			operation({
				name: 'Get',
				value: 'get',
				action: 'Get a payment method',
				description: 'Get a payment method of a customer with its type, last digits, expiry and default status',
				method: 'GET',
				url: `${PAYMENT_METHODS_URL}/{{$parameter.paymentMethodId}}`,
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many payment methods',
				description: 'List the cards, direct debit mandates and other payment methods of a customer',
				method: 'GET',
				url: PAYMENT_METHODS_URL,
				output: 'list',
			}),
			operation({
				name: 'Import',
				value: 'import',
				action: 'Import a payment method',
				description: 'Import a payment method that already exists in a connected payment provider, such as Stripe',
				method: 'POST',
				url: PAYMENT_METHODS_URL,
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
		description: 'The customer the payment method belongs to',
		displayOptions: show(['delete', 'get', 'getAll', 'import']),
	}),
	idParameter({
		name: 'paymentMethodId',
		displayName: 'Payment Method ID',
		description: 'Hyperline ID of the payment method, as returned by Get Many',
		displayOptions: show(['delete', 'get']),
	}),

	// Import
	{
		displayName: 'Provider',
		name: 'providerName',
		type: 'options',
		required: true,
		options: [
			{ name: 'Airwallex', value: 'airwallex' },
			{ name: 'GoCardless', value: 'gocardless' },
			{ name: 'Mollie', value: 'mollie' },
			{ name: 'Stripe', value: 'stripe' },
		],
		default: 'stripe',
		description: 'Payment provider that holds the payment method',
		displayOptions: show(['import']),
		routing: { send: { type: 'body', property: 'provider_name' } },
	},
	{
		displayName: 'Provider Payment Method ID',
		name: 'providerPaymentMethodId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the payment method in the provider',
		displayOptions: show(['import']),
		routing: { send: { type: 'body', property: 'provider_payment_method_id' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['import']),
		options: [
			bodyOption({
				displayName: 'Provider Connection ID',
				name: 'providerId',
				type: 'string',
				default: '',
				description:
					'Hyperline ID of the provider connection. Required when several accounts of the same provider are connected.',
			}, 'provider_id'),
		],
	},

	// Get Many
	...paginationProperties(show(['getAll']), 'none'),
];
