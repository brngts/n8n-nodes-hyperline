import type {
	IHttpRequestMethods,
	INodeProperties,
	INodePropertyOptions,
	PostReceiveAction,
} from 'n8n-workflow';
import { handleHyperlineError, returnSuccess } from './postReceive';

type OperationOptions = {
	name: string;
	value: string;
	action: string;
	description: string;
	method: IHttpRequestMethods;
	url: string;
	/** `list` unwraps the `data` array of a list response into one item per record. */
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
		postReceive = [
			handleHyperlineError,
			{ type: 'rootProperty', properties: { property: 'data' } },
		];
	} else if (output === 'success') {
		postReceive = [handleHyperlineError, returnSuccess];
	} else if (output === 'record') {
		postReceive = [handleHyperlineError];
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
