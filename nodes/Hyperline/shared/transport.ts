import type {
	IDataObject,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { apiBaseUrl, HYPERLINE_CREDENTIAL_NAME } from './constants';
import { toHyperlineError } from './errors';

/**
 * Authenticated request helper for code paths outside declarative routing
 * (list search and the trigger's webhook lifecycle). The host follows the
 * credential's Environment, the same way routed operations resolve it.
 */
export async function hyperlineApiRequest(
	this: ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs: IDataObject = {},
	body?: IDataObject,
) {
	const credentials = await this.getCredentials(HYPERLINE_CREDENTIAL_NAME);
	const options: IHttpRequestOptions = {
		method,
		qs,
		body,
		url: `${apiBaseUrl(credentials.environment)}${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			HYPERLINE_CREDENTIAL_NAME,
			options,
		);
	} catch (error) {
		throw toHyperlineError(this.getNode(), error);
	}
}
