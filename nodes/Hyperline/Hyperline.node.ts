import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import {
	getCustomers,
	getInvoices,
	getProducts,
	getQuotes,
	getSubscriptions,
} from './listSearch';
import { accountingReportDescription } from './resources/accountingReport';
import { aggregatorDescription } from './resources/aggregator';
import { approvalWorkflowDescription } from './resources/approvalWorkflow';
import { auditLogDescription } from './resources/auditLog';
import { bankAccountDescription } from './resources/bankAccount';
import { billableEventDescription } from './resources/billableEvent';
import { catalogDescription } from './resources/catalog';
import { couponDescription } from './resources/coupon';
import { customPropertyDescription } from './resources/customProperty';
import { customerDescription } from './resources/customer';
import { customerAddressDescription } from './resources/customerAddress';
import { customerCreditDescription } from './resources/customerCredit';
import { customerFeatureDescription } from './resources/customerFeature';
import { customerPaymentMethodDescription } from './resources/customerPaymentMethod';
import { customerSegmentDescription } from './resources/customerSegment';
import { customerUsageDescription } from './resources/customerUsage';
import { exportDescription } from './resources/export';
import { featureDescription } from './resources/feature';
import { fileDescription } from './resources/file';
import { invoiceDescription } from './resources/invoice';
import { priceBookDescription } from './resources/priceBook';
import { priceConfigurationDescription } from './resources/priceConfiguration';
import { productDescription } from './resources/product';
import { productFeatureDescription } from './resources/productFeature';
import { promotionCodeDescription } from './resources/promotionCode';
import { quoteDescription } from './resources/quote';
import { quoteTemplateDescription } from './resources/quoteTemplate';
import { revenueRecognitionDescription } from './resources/revenueRecognition';
import { roleDescription } from './resources/role';
import { subscriptionDescription } from './resources/subscription';
import { subscriptionPhaseDescription } from './resources/subscriptionPhase';
import { subscriptionTemplateDescription } from './resources/subscriptionTemplate';
import { subscriptionTransitionDescription } from './resources/subscriptionTransition';
import { taxRateDescription } from './resources/taxRate';
import { transactionDescription } from './resources/transaction';
import { userDescription } from './resources/user';
import { walletDescription } from './resources/wallet';
import { API_BASE_URL, HYPERLINE_CREDENTIAL_NAME } from './shared/constants';

export class Hyperline implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hyperline',
		name: 'hyperline',
		icon: { light: 'file:../../icons/hyperline.svg', dark: 'file:../../icons/hyperline.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Manage customers, subscriptions, invoices, quotes, catalog, usage, wallets and revenue recognition in Hyperline billing',
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
					{ name: 'Accounting Report', value: 'accountingReport' },
					{ name: 'Aggregator', value: 'aggregator' },
					{ name: 'Approval Workflow', value: 'approvalWorkflow' },
					{ name: 'Audit Log', value: 'auditLog' },
					{ name: 'Bank Account', value: 'bankAccount' },
					{ name: 'Billable Event', value: 'billableEvent' },
					{ name: 'Catalog', value: 'catalog' },
					{ name: 'Coupon', value: 'coupon' },
					{ name: 'Custom Property', value: 'customProperty' },
					{ name: 'Customer', value: 'customer' },
					{ name: 'Customer Address', value: 'customerAddress' },
					{ name: 'Customer Credit', value: 'customerCredit' },
					{ name: 'Customer Feature', value: 'customerFeature' },
					{ name: 'Customer Payment Method', value: 'customerPaymentMethod' },
					{ name: 'Customer Segment', value: 'customerSegment' },
					{ name: 'Customer Usage', value: 'customerUsage' },
					{ name: 'Export', value: 'export' },
					{ name: 'Feature', value: 'feature' },
					{ name: 'File', value: 'file' },
					{ name: 'Invoice', value: 'invoice' },
					{ name: 'Price Book', value: 'priceBook' },
					{ name: 'Price Configuration', value: 'priceConfiguration' },
					{ name: 'Product', value: 'product' },
					{ name: 'Product Feature', value: 'productFeature' },
					{ name: 'Promotion Code', value: 'promotionCode' },
					{ name: 'Quote', value: 'quote' },
					{ name: 'Quote Template', value: 'quoteTemplate' },
					{ name: 'Revenue Recognition', value: 'revenueRecognition' },
					{ name: 'Role', value: 'role' },
					{ name: 'Subscription', value: 'subscription' },
					{ name: 'Subscription Phase', value: 'subscriptionPhase' },
					{ name: 'Subscription Template', value: 'subscriptionTemplate' },
					{ name: 'Subscription Transition', value: 'subscriptionTransition' },
					{ name: 'Tax Rate', value: 'taxRate' },
					{ name: 'Transaction', value: 'transaction' },
					{ name: 'User', value: 'user' },
					{ name: 'Wallet', value: 'wallet' },
				],
				default: 'customer',
			},
			...accountingReportDescription,
			...aggregatorDescription,
			...approvalWorkflowDescription,
			...auditLogDescription,
			...bankAccountDescription,
			...billableEventDescription,
			...catalogDescription,
			...couponDescription,
			...customPropertyDescription,
			...customerDescription,
			...customerAddressDescription,
			...customerCreditDescription,
			...customerFeatureDescription,
			...customerPaymentMethodDescription,
			...customerSegmentDescription,
			...customerUsageDescription,
			...exportDescription,
			...featureDescription,
			...fileDescription,
			...invoiceDescription,
			...priceBookDescription,
			...priceConfigurationDescription,
			...productDescription,
			...productFeatureDescription,
			...promotionCodeDescription,
			...quoteDescription,
			...quoteTemplateDescription,
			...revenueRecognitionDescription,
			...roleDescription,
			...subscriptionDescription,
			...subscriptionPhaseDescription,
			...subscriptionTemplateDescription,
			...subscriptionTransitionDescription,
			...taxRateDescription,
			...transactionDescription,
			...userDescription,
			...walletDescription,
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
