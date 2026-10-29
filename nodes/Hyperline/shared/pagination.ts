import type { IDataObject, IN8nRequestOperationPaginationGeneric } from 'n8n-workflow';
import { PAGE_SIZE } from './constants';

/**
 * n8n replaces the whole query string with the one given here on every
 * paginated request, so each query parameter the operation may send has to be
 * carried over from `$request.qs` explicitly. Parameters that are not set
 * resolve to undefined and are dropped from the URL.
 */
function carryOver(queryParameters: string[]): IDataObject {
	const qs: IDataObject = {};
	for (const parameter of queryParameters) {
		qs[parameter] = `={{ $request.qs?.${parameter} }}`;
	}
	return qs;
}

/**
 * Newer list endpoints (`/v2/customers`, `/v2/invoices`) are cursor based:
 * every page carries `has_more` and `next_cursor`.
 */
export function cursorPagination(queryParameters: string[]): IN8nRequestOperationPaginationGeneric {
	return {
		type: 'generic',
		properties: {
			continue: '={{ $response.body?.has_more === true && !!$response.body?.next_cursor }}',
			request: {
				qs: {
					...carryOver(queryParameters),
					limit: PAGE_SIZE,
					cursor: '={{ $response.body?.next_cursor }}',
				},
			},
		},
	};
}

/**
 * Older list endpoints (subscriptions, quotes, products) page with `take` and
 * `skip` and report `meta: { total, taken, skipped }`. The loop stops once the
 * pages add up to the total, or when a page comes back empty.
 */
export function offsetPagination(queryParameters: string[]): IN8nRequestOperationPaginationGeneric {
	return {
		type: 'generic',
		properties: {
			continue:
				'={{ ($response.body?.meta?.taken ?? 0) > 0 && ($response.body?.meta?.skipped ?? 0) + ($response.body?.meta?.taken ?? 0) < ($response.body?.meta?.total ?? 0) }}',
			request: {
				qs: {
					...carryOver(queryParameters),
					take: PAGE_SIZE,
					skip: '={{ ($response.body?.meta?.skipped ?? 0) + ($response.body?.meta?.taken ?? 0) }}',
				},
			},
		},
	};
}
