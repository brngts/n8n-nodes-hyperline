import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';
import { PAGE_SIZE } from './constants';
import { cursorPagination, offsetPagination } from './pagination';
import { mergeJsonBody, sendJsonArrayBody, setJsonBodyProperty } from './preSend';

type LocatorOptions = {
	name: string;
	displayName: string;
	searchListMethod: string;
	searchable: boolean;
	idPrefix: string;
	displayOptions: IDisplayOptions;
	description?: string;
	required?: boolean;
};

/** "From List" or "By ID" picker for a Hyperline record. */
export function recordLocator({
	name,
	displayName,
	searchListMethod,
	searchable,
	idPrefix,
	displayOptions,
	description,
	required = true,
}: LocatorOptions): INodeProperties {
	return {
		displayName,
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required,
		description: description ?? `The ${displayName.toLowerCase()} to work with`,
		displayOptions,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: `Select a ${displayName.toLowerCase()}...`,
				typeOptions: {
					searchListMethod,
					searchable,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: `e.g. ${idPrefix}DKL4Xcb5VSa8CQ`,
			},
		],
	};
}

/** Customer picker that sends the selected ID as `customer_id` in the request body. */
export function customerBodyLocator(displayOptions: IDisplayOptions, description: string): INodeProperties {
	return {
		...recordLocator({
			name: 'customer',
			displayName: 'Customer',
			searchListMethod: 'getCustomers',
			searchable: true,
			idPrefix: 'cus_',
			displayOptions,
			description,
		}),
		routing: {
			send: {
				type: 'body',
				property: 'customer_id',
				value: '={{ $parameter.customer }}',
			},
		},
	};
}

type IdParameterOptions = {
	name: string;
	displayName: string;
	displayOptions: IDisplayOptions;
	placeholder?: string;
	description?: string;
	required?: boolean;
};

/**
 * A plain ID field, for records without a searchable list. Name it `<record>Id`
 * (such as `couponId`) so a 404 error can name the ID that was not found.
 */
export function idParameter({
	name,
	displayName,
	displayOptions,
	placeholder,
	description,
	required = true,
}: IdParameterOptions): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		required,
		default: '',
		placeholder,
		description,
		displayOptions,
	};
}

/**
 * "Return All" and "Limit" for a list endpoint. `queryParameters` lists every
 * filter the operation may send, so the pagination loop can repeat them on
 * follow-up requests.
 *
 * - `cursor`: `limit` and `cursor`, with `has_more` and `next_cursor` in the response
 * - `offset`: `take` and `skip`, with `meta: { total, taken, skipped }` in the response
 * - `none`: the endpoint returns everything at once, so Limit trims the output
 */
export function paginationProperties(
	displayOptions: IDisplayOptions,
	style: 'cursor' | 'offset' | 'none',
	queryParameters: string[] = [],
): INodeProperties[] {
	const limitDisplayOptions: IDisplayOptions = {
		...displayOptions,
		show: {
			...displayOptions.show,
			returnAll: [false],
		},
	};

	if (style === 'none') {
		return [
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions,
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Max number of results to return',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: limitDisplayOptions,
				routing: {
					output: {
						maxResults: '={{ $value }}',
					},
				},
			},
		];
	}

	const pageSizeParameter = style === 'cursor' ? 'limit' : 'take';
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions,
			routing: {
				send: {
					paginate: '={{ $value }}',
					type: 'query',
					property: pageSizeParameter,
					value: `={{ $value ? ${PAGE_SIZE} : undefined }}`,
				},
				operations: {
					pagination:
						style === 'cursor'
							? cursorPagination(queryParameters)
							: offsetPagination(queryParameters),
				},
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			description: 'Max number of results to return',
			typeOptions: {
				minValue: 1,
				maxValue: PAGE_SIZE,
			},
			displayOptions: limitDisplayOptions,
			routing: {
				send: {
					type: 'query',
					property: pageSizeParameter,
				},
				output: {
					maxResults: '={{ $value }}',
				},
			},
		},
	];
}

/** Free-form JSON merged into the request body, for nested structures the form does not cover. */
export function jsonBodyProperty(
	displayOptions: IDisplayOptions,
	description: string,
	placeholder: string,
): INodeProperties {
	return {
		displayName: 'Additional Body Fields (JSON)',
		name: 'jsonBody',
		type: 'json',
		default: '{}',
		placeholder,
		description,
		displayOptions,
		routing: {
			send: {
				preSend: [mergeJsonBody('jsonBody', 'Additional Body Fields (JSON)')],
			},
		},
	};
}

type JsonParameterOptions = {
	displayName: string;
	name: string;
	/** Body property the parsed JSON is sent as. */
	property: string;
	displayOptions: IDisplayOptions;
	shape?: 'object' | 'array';
	required?: boolean;
	default?: string;
	description?: string;
	placeholder?: string;
};

/**
 * A JSON field sent as one body property, for nested objects or arrays that are
 * central to the operation, such as a batch's `customers` or a segment's `rules`.
 */
export function jsonParameter({
	displayName,
	name,
	property,
	displayOptions,
	shape = 'object',
	required = false,
	default: defaultValue,
	description,
	placeholder,
}: JsonParameterOptions): INodeProperties {
	const initialJson = defaultValue ?? (shape === 'array' ? '[]' : '{}');
	return {
		displayName,
		name,
		type: 'json',
		required,
		default: initialJson,
		description,
		placeholder,
		displayOptions,
		routing: {
			send: {
				preSend: [setJsonBodyProperty(name, property, displayName, shape)],
			},
		},
	};
}

/** A JSON array sent as the whole request body, for endpoints that take a bare array. */
export function jsonArrayBodyParameter({
	displayName,
	name,
	displayOptions,
	required = true,
	default: defaultValue = '[]',
	description,
	placeholder,
}: Omit<JsonParameterOptions, 'property' | 'shape'>): INodeProperties {
	return {
		displayName,
		name,
		type: 'json',
		required,
		default: defaultValue,
		description,
		placeholder,
		displayOptions,
		routing: {
			send: {
				preSend: [sendJsonArrayBody(name, displayName)],
			},
		},
	};
}

/** Output binary field for downloads. `fileDescription` names what is downloaded, such as "PDF" or "file". */
export function binaryPropertyName(
	displayOptions: IDisplayOptions,
	fileDescription = 'PDF',
): INodeProperties {
	return {
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: `The name of the output binary field to put the ${fileDescription} in`,
		displayOptions,
	};
}

/** Input binary field for uploads. Pair with the `sendMultipartFile` preSend. */
export function binaryInputProperty(
	displayOptions: IDisplayOptions,
	fileDescription = 'file',
): INodeProperties {
	return {
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: `The name of the input binary field containing the ${fileDescription} to upload`,
		displayOptions,
	};
}

/** A "Filters" or "Fields" collection entry that sends one query parameter. */
export function queryOption(option: Omit<INodeProperties, 'routing'>, property = option.name): INodeProperties {
	return {
		...option,
		routing: {
			send: {
				type: 'query',
				property,
				value: '={{ $value === "" ? undefined : $value }}',
			},
		},
	};
}

/** A collection entry that sends one body field. Dotted names such as `billing_address.city` nest. */
export function bodyOption(option: Omit<INodeProperties, 'routing'>, property = option.name): INodeProperties {
	return {
		...option,
		routing: {
			send: {
				type: 'body',
				property,
			},
		},
	};
}

/** Keeps collection entries in the alphabetical order n8n expects. */
export function byDisplayName(a: INodeProperties, b: INodeProperties): number {
	return a.displayName.localeCompare(b.displayName);
}
