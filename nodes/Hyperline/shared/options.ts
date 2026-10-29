import type { INodePropertyOptions } from 'n8n-workflow';

/** Languages Hyperline renders invoices, emails and hosted pages in. */
export const LANGUAGE_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Dutch', value: 'nl' },
	{ name: 'English', value: 'en' },
	{ name: 'French', value: 'fr' },
	{ name: 'German', value: 'de' },
	{ name: 'Italian', value: 'it' },
	{ name: 'Lithuanian', value: 'lt' },
	{ name: 'Polish', value: 'pl' },
	{ name: 'Portuguese', value: 'pt' },
	{ name: 'Spanish', value: 'es' },
];

export const PAYMENT_METHOD_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Apple Pay', value: 'apple_pay' },
	{ name: 'Bank Transfer', value: 'transfer' },
	{ name: 'Bank Transfer (Automated)', value: 'transfer_automated' },
	{ name: 'Card', value: 'card' },
	{ name: 'Direct Debit (ACH)', value: 'direct_debit_ach' },
	{ name: 'Direct Debit (BACS)', value: 'direct_debit_bacs' },
	{ name: 'Direct Debit (SEPA)', value: 'direct_debit' },
	{ name: 'External', value: 'external' },
	{ name: 'Google Pay', value: 'google_pay' },
	{ name: 'PayPal', value: 'paypal' },
	{ name: 'Stripe Link', value: 'stripe_link' },
];

export const REFUND_METHOD_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'External',
		value: 'external',
		description: 'Record the refund as settled outside Hyperline',
	},
	{
		name: 'Original Payment Method',
		value: 'original_payment_method',
		description: 'Refund to the payment method that paid the invoice',
	},
	{
		name: 'Wallet',
		value: 'wallet',
		description: 'Credit the customer wallet',
	},
];
