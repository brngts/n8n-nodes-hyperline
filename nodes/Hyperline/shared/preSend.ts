import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
} from 'n8n-workflow';

function parseJsonObject(context: IExecuteSingleFunctions, value: unknown, label: string): IDataObject {
	if (value === undefined || value === null || value === '') return {};
	let parsed: unknown = value;
	if (typeof value === 'string') {
		try {
			parsed = JSON.parse(value);
		} catch {
			throw new NodeOperationError(context.getNode(), `${label} is not valid JSON`, {
				description: 'Check for missing quotes, trailing commas or unescaped characters.',
			});
		}
	}
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new NodeOperationError(context.getNode(), `${label} must be a JSON object`, {
			description: 'Wrap the fields in curly braces, for example {"purchase_order": "PO-123"}.',
		});
	}
	return parsed as IDataObject;
}

/**
 * Merges a JSON parameter into the request body, for the nested structures
 * (products, phases, line items, addresses) that do not fit a flat form. Fields
 * set through the node's own parameters win over the same key in the JSON.
 */
export function mergeJsonBody(parameterName: string, label: string) {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const extra = parseJsonObject(this, this.getNodeParameter(parameterName, '{}'), label);
		const body = (requestOptions.body ?? {}) as IDataObject;
		requestOptions.body = { ...extra, ...body };
		return requestOptions;
	};
}

/** Sends a JSON object parameter as a single body property, such as a usage event's `record`. */
export function setJsonBodyProperty(parameterName: string, bodyProperty: string, label: string) {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const value = parseJsonObject(this, this.getNodeParameter(parameterName, '{}'), label);
		requestOptions.body = { ...((requestOptions.body ?? {}) as IDataObject), [bodyProperty]: value };
		return requestOptions;
	};
}
