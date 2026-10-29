import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import {
	getCustomers,
	getInvoices,
	getProducts,
	getQuotes,
	getSubscriptions,
} from './listSearch';
import { billableEventDescription } from './resources/billableEvent';
import { customerDescription } from './resources/customer';
import { invoiceDescription } from './resources/invoice';
import { productDescription } from './resources/product';
import { quoteDescription } from './resources/quote';
import { subscriptionDescription } from './resources/subscription';
import { API_BASE_URL, HYPERLINE_CREDENTIAL_NAME } from './shared/constants';

export class Hyperline implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hyperline',
		name: 'hyperline',
		icon: { light: 'file:../../icons/hyperline.svg', dark: 'file:../../icons/hyperline.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage customers, subscriptions, invoices and quotes in Hyperline billing',
		defaults: {
			name: 'Hyperline',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: HYPERLINE_CREDENTIAL_NAME,
				required: true,
			},
		],
		requestDefaults: {
			baseURL: API_BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Product',
						value: 'product',
					},
					{
						name: 'Quote',
						value: 'quote',
					},
					{
						name: 'Subscription',
						value: 'subscription',
					},
					{
						name: 'Usage Event',
						value: 'billableEvent',
					},
				],
				default: 'customer',
			},
			...customerDescription,
			...invoiceDescription,
			...productDescription,
			...quoteDescription,
			...subscriptionDescription,
			...billableEventDescription,
		],
	};

	methods = {
		listSearch: {
			getCustomers,
			getInvoices,
			getProducts,
			getQuotes,
			getSubscriptions,
		},
	};
}
