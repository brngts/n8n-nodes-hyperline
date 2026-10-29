import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

type LineItemInput = {
	name?: string;
	description?: string;
	productId?: string;
	unitAmount?: number;
	unitsCount?: number;
	taxRate?: number;
	periodStart?: string;
	periodEnd?: string;
};

const FIELD_NAMES: Record<keyof LineItemInput, string> = {
	name: 'name',
	description: 'description',
	productId: 'product_id',
	unitAmount: 'unit_amount',
	unitsCount: 'units_count',
	taxRate: 'tax_rate',
	periodStart: 'period_start',
	periodEnd: 'period_end',
};

/** Maps one form row to Hyperline's line item shape, leaving out fields the user left empty. */
export function toLineItem(input: LineItemInput): IDataObject {
	const lineItem: IDataObject = {};
	for (const [key, apiName] of Object.entries(FIELD_NAMES)) {
		const value = input[key as keyof LineItemInput];
		if (value !== undefined && value !== '') lineItem[apiName] = value;
	}
	return lineItem;
}

/**
 * Sends the "Line Items" rows as `line_items`. When no rows are set, the body
 * is left alone so line items can come from the JSON field instead.
 */
export async function sendLineItems(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const rows = this.getNodeParameter('lineItems.lineItem', []) as LineItemInput[];
	if (rows.length === 0) return requestOptions;
	requestOptions.body = {
		...((requestOptions.body ?? {}) as IDataObject),
		line_items: rows.map(toLineItem),
	};
	return requestOptions;
}
