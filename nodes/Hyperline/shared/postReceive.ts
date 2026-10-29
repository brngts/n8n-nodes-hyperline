import {
	NodeApiError,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type JsonObject,
	type PostReceiveAction,
} from 'n8n-workflow';
import { HYPERLINE_CREDENTIAL_NAME } from './constants';
import { DESCRIPTIONS_BY_STATUS, environmentMismatchHint, readApiMessage } from './errors';

/**
 * Identifier parameters, in the order they should be reported. Only one of
 * these is on screen for any given operation; the rest resolve to the fallback.
 */
const IDENTIFIER_PARAMETERS = ['customer', 'subscription', 'invoice', 'quote', 'product'] as const;

function findIdentifier(context: IExecuteSingleFunctions): string | undefined {
	const { parameters } = context.getNode();
	for (const parameter of IDENTIFIER_PARAMETERS) {
		// `extractValue` throws for parameters the current operation does not define
		if (!(parameter in parameters)) continue;
		const value = context.getNodeParameter(parameter, '', { extractValue: true });
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
		const { body } = response;
		const buffer = Buffer.isBuffer(body)
			? body
			: typeof body === 'string'
				? Buffer.from(body, 'binary')
				: Buffer.from(body as ArrayBuffer);
		const binaryData = await this.helpers.prepareBinaryData(buffer, fileName, 'application/pdf');
		return [
			{
				json: { id, fileName },
				binary: { [binaryPropertyName]: binaryData },
			},
		];
	};
}
