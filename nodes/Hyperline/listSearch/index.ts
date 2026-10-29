import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { PAGE_SIZE } from '../shared/constants';
import { hyperlineApiRequest } from '../shared/transport';

type CursorPage = { data: IDataObject[]; has_more?: boolean; next_cursor?: string | null };
type OffsetPage = { data: IDataObject[]; meta?: { total?: number; taken?: number; skipped?: number } };

function formatAmount(amount: unknown, currency: unknown): string | undefined {
	if (typeof amount !== 'number') return undefined;
	return `${(amount / 100).toFixed(2)} ${typeof currency === 'string' ? currency : ''}`.trim();
}

function label(...parts: Array<string | undefined | null | false>): string {
	return parts.filter((part): part is string => typeof part === 'string' && part !== '').join(' · ');
}

async function cursorSearch(
	context: ILoadOptionsFunctions,
	endpoint: string,
	qs: IDataObject,
	paginationToken: string | undefined,
	toItem: (record: IDataObject) => INodeListSearchItems,
): Promise<INodeListSearchResult> {
	const page: CursorPage = await hyperlineApiRequest.call(context, 'GET', endpoint, {
		...qs,
		limit: PAGE_SIZE,
		cursor: paginationToken,
	});
	return {
		results: (page.data ?? []).map(toItem),
		paginationToken: page.has_more && page.next_cursor ? page.next_cursor : undefined,
	};
}

async function offsetSearch(
	context: ILoadOptionsFunctions,
	endpoint: string,
	qs: IDataObject,
	paginationToken: string | undefined,
	toItem: (record: IDataObject) => INodeListSearchItems,
): Promise<INodeListSearchResult> {
	const skip = Number(paginationToken ?? 0);
	const page: OffsetPage = await hyperlineApiRequest.call(context, 'GET', endpoint, {
		...qs,
		take: PAGE_SIZE,
		skip,
	});
	const records = page.data ?? [];
	const next = skip + records.length;
	return {
		results: records.map(toItem),
		paginationToken:
			records.length > 0 && next < (page.meta?.total ?? 0) ? String(next) : undefined,
	};
}

export async function getCustomers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await cursorSearch(
		this,
		'/v2/customers',
		{ search: filter || undefined, sort: 'created_at', order: 'desc' },
		paginationToken,
		(customer) => ({
			name: label(
				String(customer.name ?? customer.id),
				customer.status === 'archived' && '(archived)',
				typeof customer.external_id === 'string' && customer.external_id,
			),
			value: String(customer.id),
		}),
	);
}

export async function getSubscriptions(
	this: ILoadOptionsFunctions,
	_filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await offsetSearch(this, '/v2/subscriptions', {}, paginationToken, (subscription) => ({
		name: label(
			String(subscription.name ?? subscription.id),
			String(subscription.status ?? ''),
			String(subscription.customer_id ?? ''),
		),
		value: String(subscription.id),
	}));
}

export async function getInvoices(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await cursorSearch(
		this,
		'/v2/invoices',
		{ invoice_number__contains: filter || undefined, sort: 'created_at', order: 'desc' },
		paginationToken,
		(invoice) => {
			const customer = (invoice.customer ?? {}) as IDataObject;
			return {
				name: label(
					typeof invoice.number === 'string' ? invoice.number : `Draft ${String(invoice.id)}`,
					typeof customer.name === 'string' && customer.name,
					formatAmount(invoice.total_amount, invoice.currency),
					String(invoice.status ?? ''),
				),
				value: String(invoice.id),
			};
		},
	);
}

export async function getQuotes(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await offsetSearch(
		this,
		'/v1/quotes',
		{ number__contains: filter || undefined },
		paginationToken,
		(quote) => ({
			name: label(
				quote.number !== undefined && quote.number !== null
					? `Quote ${String(quote.number)}`
					: String(quote.id),
				String(quote.status ?? ''),
				formatAmount(quote.amount, quote.currency),
			),
			value: String(quote.id),
		}),
	);
}

export async function getProducts(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await offsetSearch(
		this,
		'/v1/products',
		{ name__contains: filter || undefined, status: 'active' },
		paginationToken,
		(product) => ({
			name: label(String(product.name ?? product.id), String(product.type ?? '')),
			value: String(product.id),
		}),
	);
}
