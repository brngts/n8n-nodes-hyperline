import type {
	IHttpRequestMethods,
	INodeProperties,
	INodePropertyOptions,
	PostReceiveAction,
} from 'n8n-workflow';
import { handleHyperlineError, returnSuccess, splitArrayResponse, unwrapList } from './postReceive';

type OperationOptions = {
	name: string;
	value: string;
	action: string;
	description: string;
	method: IHttpRequestMethods;
	url: string;
	/**
	 * `record` returns the response as is (a bare array becomes one item per entry),
	 * `list` returns one item per record of a list response, and `success` returns
	 * `{ success: true }` for empty responses. Pass actions for anything else, such
	 * as `binaryDownload`.
	 */
	output?: 'record' | 'list' | 'success' | PostReceiveAction[];
	request?: Record<string, unknown>;
};

/**
 * One operation of a resource. Every request sets `ignoreHttpStatusErrors` so
 * `handleHyperlineError` can surface Hyperline's own message.
 */
export function operation({
	name,
	value,
	action,
	description,
	method,
	url,
	output = 'record',
	request = {},
}: OperationOptions): INodePropertyOptions {
	let postReceive: PostReceiveAction[];
	if (output === 'list') {
		postReceive = [handleHyperlineError, unwrapList];
	} else if (output === 'success') {
		postReceive = [handleHyperlineError, returnSuccess];
	} else if (output === 'record') {
		postReceive = [handleHyperlineError, splitArrayResponse];
	} else {
		postReceive = [handleHyperlineError, ...output];
	}

	return {
		name,
		value,
		action,
		description,
		routing: {
			request: {
				method,
				url,
				ignoreHttpStatusErrors: true,
				...request,
			},
			output: { postReceive },
		},
	};
}

/**
 * Request settings for file downloads: the body is kept as raw bytes and
 * Hyperline's redirects to the stored file are followed. The API key is only
 * sent along when the redirect stays on the same origin, so it never reaches
 * the storage host (signed storage URLs also reject a second credential).
 * Pair with `binaryDownload`, or spread it and override `headers`.
 */
export const DOWNLOAD_REQUEST = {
	encoding: 'arraybuffer',
	json: false,
	headers: { Accept: '*/*' },
	sendCredentialsOnCrossOriginRedirect: false,
} as const;

/** The "Operation" dropdown for a resource. */
export function operationSelector(
	resource: string,
	options: INodePropertyOptions[],
	defaultOperation: string,
): INodeProperties {
	return {
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options,
		default: defaultOperation,
	};
}
