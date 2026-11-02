import type {
	IExecuteSingleFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { bodyOption, idParameter, paginationProperties } from '../../shared/descriptions';
import { operation, operationSelector } from '../../shared/operations';

const RESOURCE = 'catalog';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

/** Hyperline answers `null` when there is no pending draft: return no items instead of an empty one. */
async function dropEmptyDraft(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	return items.filter(
		(item) =>
			typeof item.json === 'object' && item.json !== null && Object.keys(item.json).length > 0,
	);
}

export const catalogDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create Draft',
				value: 'createDraft',
				action: 'Create a catalog draft',
				description: 'Start a catalog draft that stages product changes until it is published',
				method: 'POST',
				url: '/v1/catalog/versions/draft',
			}),
			operation({
				name: 'Discard Draft',
				value: 'discardDraft',
				action: 'Discard the catalog draft',
				description: 'Discard the pending catalog draft without publishing it',
				method: 'DELETE',
				url: '/v1/catalog/versions/draft',
				output: 'success',
			}),
			operation({
				name: 'Export',
				value: 'export',
				action: 'Export the catalog',
				description: 'Export the product catalog',
				method: 'GET',
				url: '/v1/catalog/export',
			}),
			operation({
				name: 'Get Draft',
				value: 'getDraft',
				action: 'Get the catalog draft',
				description: 'Get the pending catalog draft, or no items when there is none',
				method: 'GET',
				url: '/v1/catalog/versions/draft',
				output: [dropEmptyDraft],
			}),
			operation({
				name: 'Get Many Versions',
				value: 'getAllVersions',
				action: 'Get many catalog versions',
				description: 'List catalog versions: the pending draft and the published history',
				method: 'GET',
				url: '/v1/catalog/versions',
				output: 'list',
			}),
			operation({
				name: 'Get Version',
				value: 'getVersion',
				action: 'Get a catalog version',
				description: 'Get a catalog version by ID',
				method: 'GET',
				url: '=/v1/catalog/versions/{{$parameter.catalogVersionId}}',
			}),
			operation({
				name: 'Publish Draft',
				value: 'publishDraft',
				action: 'Publish the catalog draft',
				description: 'Publish the pending catalog draft so its changes become the live catalog',
				method: 'POST',
				url: '/v1/catalog/versions/draft/publish',
				output: 'success',
			}),
			operation({
				name: 'Revert to Version',
				value: 'revertToVersion',
				action: 'Revert the catalog to a version',
				description: 'Revert the catalog to an earlier version',
				method: 'POST',
				url: '=/v1/catalog/versions/{{$parameter.catalogVersionId}}/revert',
				output: 'success',
			}),
		],
		'getDraft',
	),
	idParameter({
		name: 'catalogVersionId',
		displayName: 'Catalog Version ID',
		displayOptions: show(['getVersion', 'revertToVersion']),
	}),

	// Create Draft
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['createDraft']),
		options: [
			bodyOption({
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			}),
			bodyOption({
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			}),
		],
	},

	// Get Many Versions
	...paginationProperties(show(['getAllVersions']), 'none'),
];
