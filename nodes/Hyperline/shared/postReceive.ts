import {
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type JsonObject,
	type PostReceiveAction,
} from 'n8n-workflow';
import { HYPERLINE_CREDENTIAL_NAME } from './constants';
import { DESCRIPTIONS_BY_STATUS, environmentMismatchHint, readApiMessage } from './errors';

/**
 * Record pickers of the original resources. Plain ID parameters (names ending
 * in `Id`, such as `transactionId`) are checked before them: when an operation
 * has both, as in Invoice > Delete Transaction, the plain ID is the more
 * specific record and the likelier one to be missing.
 */
const IDENTIFIER_PARAMETERS = ['customer', 'subscription', 'invoice', 'quote', 'product'];

function findIdentifier(context: IExecuteSingleFunctions): string | undefined {
	const { parameters } = context.getNode();
	const candidates = [
		...Object.keys(parameters).filter((name) => /^[a-z][A-Za-z]*Id$/.test(name)),
		...IDENTIFIER_PARAMETERS,
	];
	for (const parameter of candidates) {
		// `extractValue` throws for parameters the current operation does not define
		if (!(parameter in parameters)) continue;
		let value: unknown;
		try {
			value = context.getNodeParameter(parameter, '', { extractValue: true });
		} catch {
			continue;
		}
		if (typeof value === 'string' && value !== '') {
			return value;
		}
	}
	return undefined;
}

async function unauthorizedHint(context: IExecuteSingleFunctions): Promise<string | undefined> {
	try {
		const credentials = await context.getCredentials(HYPERLINE_CREDENTIAL_NAME);
		return environmentMismatchHint(credentials.apiKey, credentials.environment);
	} catch {
		return undefined;
	}
}

/**
 * Turns Hyperline's `{ message }` error bodies into readable errors. Requests
 * using this handler must set `ignoreHttpStatusErrors: true`, otherwise n8n
 * throws its generic error before this function runs.
 */
export async function handleHyperlineError(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode < 400) {
		return items;
	}

	const apiMessage = readApiMessage(response.body);
	const errorBody: JsonObject = {
		statusCode: response.statusCode,
		message: apiMessage ?? null,
	};

	const identifier = response.statusCode === 404 ? findIdentifier(this) : undefined;
	const hint =
		(response.statusCode === 401 ? await unauthorizedHint(this) : undefined) ??
		DESCRIPTIONS_BY_STATUS[response.statusCode];

	// Naming the identifier is more useful than a generic "not found", so it
	// takes over the message and the API's own wording moves into the description.
	throw new NodeApiError(this.getNode(), errorBody, {
		message: identifier
			? `Hyperline could not find "${identifier}"`
			: (apiMessage ?? `Hyperline request failed with status ${response.statusCode}`),
		description: [identifier ? apiMessage : undefined, hint].filter(Boolean).join(' ') || undefined,
		httpCode: String(response.statusCode),
	});
}

/** Deletes and some actions answer with an empty body. Return something useful instead. */
export async function returnSuccess(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const hasContent = items.some(
		(item) => typeof item.json === 'object' && item.json !== null && Object.keys(item.json).length > 0,
	);
	return hasContent ? items : [{ json: { success: true } }];
}

function isObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toItem(value: unknown): INodeExecutionData {
	return { json: isObject(value) ? value : { value: value as IDataObject[string] } };
}

/**
 * One item per record of a list response. Handles both shapes Hyperline uses:
 * `{ data: [...] }` with pagination metadata, and a bare JSON array.
 */
export async function unwrapList(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	return items.flatMap((item) => {
		const json = item.json as unknown;
		if (Array.isArray(json)) return json.map(toItem);
		if (isObject(json) && Array.isArray(json.data)) return json.data.map(toItem);
		return [item];
	});
}

/** Splits a bare JSON array response into one item per entry, and leaves objects alone. */
export async function splitArrayResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	return items.flatMap((item) => {
		const json = item.json as unknown;
		return Array.isArray(json) ? json.map(toItem) : [item];
	});
}

const EXTENSIONS: Record<string, string> = {
	'application/json': 'json',
	'application/pdf': 'pdf',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
	'application/zip': 'zip',
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'text/csv': 'csv',
	'text/plain': 'txt',
};

function headerValue(headers: IDataObject, name: string): string | undefined {
	const key = Object.keys(headers).find((header) => header.toLowerCase() === name);
	const value = key === undefined ? undefined : headers[key];
	if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
	return typeof value === 'string' ? value : undefined;
}

/** Reads the file name from `Content-Disposition`, preferring the RFC 5987 `filename*` form. */
export function fileNameFromDisposition(disposition: string | undefined): string | undefined {
	if (!disposition) return undefined;
	const encoded = /filename\*\s*=\s*(?:[\w-]+'[^']*')?([^;]+)/i.exec(disposition);
	if (encoded) {
		try {
			return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''));
		} catch {
			// fall through to the plain form
		}
	}
	const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(disposition);
	const name = (plain?.[2] ?? plain?.[1])?.trim();
	return name ? name : undefined;
}

function toBuffer(body: unknown): Buffer {
	if (Buffer.isBuffer(body)) return body;
	if (typeof body === 'string') return Buffer.from(body, 'binary');
	if (body instanceof ArrayBuffer) return Buffer.from(body);
	if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
	return Buffer.from(JSON.stringify(body ?? null));
}

type DownloadOptions = {
	/** Start of the fallback file name, such as `export`, followed by the record ID. */
	fileNamePrefix: string;
	/** Parameter holding the record ID, used in the fallback file name. */
	idParameter: string;
	/** Used when the response has no usable `Content-Type`. */
	defaultMimeType?: string;
};

/**
 * Turns a file download into a binary item. The MIME type and file name come
 * from the response headers when Hyperline sends them. Pair it with
 * `DOWNLOAD_REQUEST` and a `binaryPropertyName` parameter.
 */
export function binaryDownload({
	fileNamePrefix,
	idParameter,
	defaultMimeType = 'application/octet-stream',
}: DownloadOptions): PostReceiveAction {
	return async function (
		this: IExecuteSingleFunctions,
		_items: INodeExecutionData[],
		response: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		const id = String(this.getNodeParameter(idParameter, '', { extractValue: true }));
		const binaryPropertyName = String(this.getNodeParameter('binaryPropertyName', 'data'));
		const headers = (response.headers ?? {}) as IDataObject;
		const contentType = headerValue(headers, 'content-type')?.split(';')[0].trim();
		const mimeType =
			contentType && contentType !== 'application/octet-stream' ? contentType : defaultMimeType;
		const extension = EXTENSIONS[mimeType];
		const fileName =
			fileNameFromDisposition(headerValue(headers, 'content-disposition')) ??
			`${fileNamePrefix}-${id}${extension ? `.${extension}` : ''}`;
		const binaryData = await this.helpers.prepareBinaryData(
			toBuffer(response.body),
			fileName,
			mimeType,
		);
		return [
			{
				json: { id, fileName, mimeType },
				binary: { [binaryPropertyName]: binaryData },
			},
		];
	};
}

/** Turns a PDF download into a binary item named after the record it belongs to. */
export function pdfToBinary(fileNamePrefix: string, idParameter: string): PostReceiveAction {
	return async function (
		this: IExecuteSingleFunctions,
		_items: INodeExecutionData[],
		response: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		const id = String(this.getNodeParameter(idParameter, '', { extractValue: true }));
		const binaryPropertyName = String(this.getNodeParameter('binaryPropertyName', 'data'));
		const fileName = `${fileNamePrefix}-${id}.pdf`;
		const binaryData = await this.helpers.prepareBinaryData(
			toBuffer(response.body),
			fileName,
			'application/pdf',
		);
		return [
			{
				json: { id, fileName },
				binary: { [binaryPropertyName]: binaryData },
			},
		];
	};
}
