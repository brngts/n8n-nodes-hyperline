import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type PreSendAction,
} from 'n8n-workflow';

/**
 * A preSend function that writes body fields routing cannot show. The
 * description tests read `bodyProperties` to check those fields against the
 * Hyperline OpenAPI spec as well.
 */
export type BodyPreSend = PreSendAction & { bodyProperties: string[] };

export function withBodyProperties(action: PreSendAction, bodyProperties: string[]): BodyPreSend {
	return Object.assign(action, { bodyProperties });
}

type JsonShape = 'object' | 'array';

function isEmpty(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

function parseJson(
	context: IExecuteSingleFunctions,
	value: unknown,
	label: string,
	shape: JsonShape,
): IDataObject | unknown[] {
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
	if (shape === 'array' && !Array.isArray(parsed)) {
		throw new NodeOperationError(context.getNode(), `${label} must be a JSON array`, {
			description: 'Wrap the entries in square brackets, for example [{"name": "Acme"}].',
		});
	}
	if (shape === 'object' && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
		throw new NodeOperationError(context.getNode(), `${label} must be a JSON object`, {
			description: 'Wrap the fields in curly braces, for example {"purchase_order": "PO-123"}.',
		});
	}
	return parsed as IDataObject | unknown[];
}

function currentBody(requestOptions: IHttpRequestOptions): IDataObject {
	const { body } = requestOptions;
	return typeof body === 'object' && body !== null && !Array.isArray(body) && !Buffer.isBuffer(body)
		? (body as IDataObject)
		: {};
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
		const value = this.getNodeParameter(parameterName, '{}');
		const extra = isEmpty(value) ? {} : (parseJson(this, value, label, 'object') as IDataObject);
		requestOptions.body = { ...extra, ...currentBody(requestOptions) };
		return requestOptions;
	};
}

/**
 * Sends a JSON parameter as a single body property, such as a usage event's
 * `record` (an object) or a batch's `customers` (an array). An empty parameter
 * leaves the property out.
 */
export function setJsonBodyProperty(
	parameterName: string,
	bodyProperty: string,
	label: string,
	shape: JsonShape = 'object',
): BodyPreSend {
	const action = async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const value = this.getNodeParameter(parameterName, '');
		if (isEmpty(value)) return requestOptions;
		requestOptions.body = {
			...currentBody(requestOptions),
			[bodyProperty]: parseJson(this, value, label, shape),
		};
		return requestOptions;
	};
	return withBodyProperties(action, [bodyProperty]);
}

/** Sends a JSON array parameter as the whole request body, for endpoints that take a bare array. */
export function sendJsonArrayBody(parameterName: string, label: string): BodyPreSend {
	const action = async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.body = parseJson(this, this.getNodeParameter(parameterName, '[]'), label, 'array');
		return requestOptions;
	};
	return withBodyProperties(action, []);
}

function formValue(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value);
}

function quoteHeaderValue(value: string): string {
	return value.replace(/[\r\n"]/g, '_');
}

/**
 * Turns the request into a `multipart/form-data` upload: the input binary file
 * goes in `fileField` and every body field set by routing becomes a text part.
 * The body is assembled by hand so the node needs no runtime dependencies.
 */
export function sendMultipartFile(fileField: string, binaryParameter = 'binaryPropertyName'): BodyPreSend {
	const action = async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const propertyName = String(this.getNodeParameter(binaryParameter, 'data'));
		const binary = this.helpers.assertBinaryData(propertyName);
		const content = await this.helpers.getBinaryDataBuffer(propertyName);
		const boundary = `----n8nHyperline${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
		const parts: Buffer[] = [];

		for (const [name, value] of Object.entries(currentBody(requestOptions))) {
			if (value === undefined || value === null) continue;
			parts.push(
				Buffer.from(
					`--${boundary}\r\nContent-Disposition: form-data; name="${quoteHeaderValue(name)}"\r\n\r\n${formValue(value)}\r\n`,
				),
			);
		}

		const fileName = quoteHeaderValue(binary.fileName ?? 'file');
		parts.push(
			Buffer.from(
				`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: ${binary.mimeType || 'application/octet-stream'}\r\n\r\n`,
			),
			content,
			Buffer.from(`\r\n--${boundary}--\r\n`),
		);

		requestOptions.body = Buffer.concat(parts);
		requestOptions.headers = {
			...(requestOptions.headers ?? {}),
			'Content-Type': `multipart/form-data; boundary=${boundary}`,
		};
		return requestOptions;
	};
	return withBodyProperties(action, []);
}
