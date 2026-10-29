import { NodeApiError, type INode, type JsonObject } from 'n8n-workflow';

/** Hints shown under Hyperline's own message for the errors users run into most. */
export const DESCRIPTIONS_BY_STATUS: Record<number, string> = {
	400: 'Hyperline rejected the request. Check the values you entered against the Hyperline API reference. Amounts are in cents.',
	401: 'Check that the API key is valid and belongs to the environment set in the credential. Sandbox keys only work on the sandbox host.',
	403: 'The API key is not allowed to perform this action.',
	404: 'Check the ID. Customer IDs start with "cus_", subscriptions with "sub_", invoices with "inv_", quotes with "quo_" and products with "itm_". IDs only exist in the environment they were created in.',
	409: 'The record is in a state that does not allow this action.',
	429: 'Hyperline is rate limiting requests. Use the batching settings under the node options to space them out.',
	503: 'Hyperline is temporarily unavailable. Retry the request later, for example with "Retry On Fail" in the node settings.',
};

function parseBody(body: unknown): unknown {
	if (Buffer.isBuffer(body) || body instanceof ArrayBuffer) {
		body = Buffer.from(body as ArrayBuffer).toString('utf8');
	}
	if (typeof body === 'string') {
		try {
			return JSON.parse(body);
		} catch {
			return body;
		}
	}
	return body;
}

/**
 * Hyperline error bodies look like `{ message }`, sometimes with extra
 * `statusCode`, `type` or `errors` fields. Download endpoints return the error
 * as a raw buffer, so the body is parsed first.
 */
export function readApiMessage(rawBody: unknown): string | undefined {
	const body = parseBody(rawBody);
	if (typeof body !== 'object' || body === null) return undefined;
	const { message, errors } = body as { message?: unknown; errors?: unknown };
	const parts: string[] = [];
	if (typeof message === 'string' && message.length > 0) parts.push(message);
	else if (Array.isArray(message)) parts.push(message.filter((m) => typeof m === 'string').join('; '));
	if (Array.isArray(errors)) {
		for (const entry of errors) {
			if (typeof entry === 'string') parts.push(entry);
			else if (typeof entry === 'object' && entry !== null && 'message' in entry) {
				parts.push(String((entry as { message: unknown }).message));
			}
		}
	}
	const text = parts.filter(Boolean).join(' ');
	return text.length > 0 ? text : undefined;
}

/** Points at the most common 401 cause: a key from the other environment. */
export function environmentMismatchHint(apiKey: unknown, environment: unknown): string | undefined {
	if (typeof apiKey !== 'string') return undefined;
	if (apiKey.startsWith('test_') && environment !== 'sandbox') {
		return 'The API key starts with "test_", which is a sandbox key, but the credential is set to Production. Switch the credential Environment to Sandbox.';
	}
	if (apiKey.startsWith('prod_') && environment === 'sandbox') {
		return 'The API key starts with "prod_", which is a production key, but the credential is set to Sandbox. Switch the credential Environment to Production.';
	}
	return undefined;
}

function readStatusCode(error: unknown): number | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	const candidates: unknown[] = [];
	if ('httpCode' in error) candidates.push(error.httpCode);
	if ('statusCode' in error) candidates.push(error.statusCode);
	if ('cause' in error && typeof error.cause === 'object' && error.cause !== null) {
		const cause = error.cause as Record<string, unknown>;
		candidates.push(cause.statusCode, cause.httpCode);
		if (typeof cause.response === 'object' && cause.response !== null) {
			candidates.push((cause.response as Record<string, unknown>).status);
		}
	}
	for (const candidate of candidates) {
		const parsed = Number(candidate);
		if (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) return parsed;
	}
	return undefined;
}

/** Finds Hyperline's message in an error thrown by `httpRequestWithAuthentication`. */
function readHyperlineMessage(error: unknown): string | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	if ('cause' in error && typeof error.cause === 'object' && error.cause !== null) {
		const cause = error.cause as Record<string, unknown>;
		const response = cause.response as Record<string, unknown> | undefined;
		const fromResponse =
			readApiMessage(response?.data) ??
			readApiMessage(response?.body) ??
			readApiMessage(cause.error) ??
			readApiMessage(cause);
		if (fromResponse) return fromResponse;
	}
	if ('description' in error && typeof error.description === 'string' && error.description !== '') {
		return error.description;
	}
	return undefined;
}

/**
 * Rethrows a failed request from the trigger or list search as an error that
 * leads with Hyperline's own message instead of n8n's generic one.
 */
export function toHyperlineError(node: INode, error: unknown): NodeApiError {
	if (error instanceof NodeApiError && error.context.hyperlineHandled === true) {
		return error;
	}
	const statusCode = readStatusCode(error);
	const apiMessage = readHyperlineMessage(error);
	const fallback = error instanceof Error ? error.message : String(error);
	const errorBody: JsonObject = {
		statusCode: statusCode ?? null,
		message: apiMessage ?? fallback,
	};
	const wrapped = new NodeApiError(node, errorBody, {
		message: apiMessage ?? fallback,
		description: statusCode === undefined ? undefined : DESCRIPTIONS_BY_STATUS[statusCode],
		httpCode: statusCode === undefined ? undefined : String(statusCode),
	});
	wrapped.context.hyperlineHandled = true;
	return wrapped;
}
