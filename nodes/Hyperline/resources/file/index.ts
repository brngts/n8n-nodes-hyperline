import type { INodeProperties } from 'n8n-workflow';
import {
	binaryInputProperty,
	binaryPropertyName,
	customerBodyLocator,
	idParameter,
	paginationProperties,
	queryOption,
} from '../../shared/descriptions';
import { DOWNLOAD_REQUEST, operation, operationSelector } from '../../shared/operations';
import { binaryDownload } from '../../shared/postReceive';
import { sendMultipartFile } from '../../shared/preSend';

const RESOURCE = 'file';

const show = (operations: string[]) => ({ show: { resource: [RESOURCE], operation: operations } });

const fileGetManyQueryParameters = ['customer_id', 'name', 'name__contains'];

export const fileDescription: INodeProperties[] = [
	operationSelector(
		RESOURCE,
		[
			operation({
				name: 'Create Upload URL',
				value: 'createUploadUrl',
				action: 'Create an upload URL',
				description: 'Stage a file upload and get a URL to send the file content to',
				method: 'POST',
				url: '/v1/files/uploads',
			}),
			operation({
				name: 'Delete',
				value: 'delete',
				action: 'Delete a file',
				description: 'Permanently delete a file',
				method: 'DELETE',
				url: '=/v1/files/{{$parameter.fileId}}',
				output: 'success',
			}),
			operation({
				name: 'Download',
				value: 'download',
				action: 'Download a file',
				description: 'Download the content of a file',
				method: 'GET',
				url: '=/v1/files/{{$parameter.fileId}}/download',
				output: [binaryDownload({ fileNamePrefix: 'file', idParameter: 'fileId' })],
				request: DOWNLOAD_REQUEST,
			}),
			operation({
				name: 'Download Upload',
				value: 'downloadUpload',
				action: 'Download a staged upload',
				description: 'Download the content of a file staged with Create Upload URL',
				method: 'GET',
				url: '=/v1/files/uploads/{{$parameter.uploadId}}/download',
				output: [binaryDownload({ fileNamePrefix: 'upload', idParameter: 'uploadId' })],
				request: DOWNLOAD_REQUEST,
			}),
			operation({
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many files',
				description: 'List uploaded files',
				method: 'GET',
				url: '/v1/files',
				output: 'list',
			}),
			operation({
				name: 'Upload',
				value: 'upload',
				action: 'Upload a file',
				description: 'Upload a file of up to 10 MB and link it to a customer',
				method: 'POST',
				url: '/v1/files',
			}),
		],
		'getAll',
	),
	idParameter({
		name: 'fileId',
		displayName: 'File ID',
		displayOptions: show(['delete', 'download']),
	}),
	idParameter({
		name: 'uploadId',
		displayName: 'Upload ID',
		description: 'ID returned by Create Upload URL',
		displayOptions: show(['downloadUpload']),
	}),

	// Create Upload URL
	{
		displayName: 'File Name',
		name: 'filename',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. contract.pdf',
		description: 'Name of the file, including its extension',
		displayOptions: show(['createUploadUrl']),
		routing: { send: { type: 'body', property: 'filename' } },
	},
	{
		displayName: 'MIME Type',
		name: 'mimeType',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. application/pdf',
		displayOptions: show(['createUploadUrl']),
		routing: { send: { type: 'body', property: 'mime_type' } },
	},

	// Download, Download Upload
	binaryPropertyName(show(['download', 'downloadUpload']), 'file'),

	// Get Many
	...paginationProperties(show(['getAll']), 'offset', fileGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			queryOption({
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				placeholder: 'e.g. cus_DKL4Xcb5VSa8CQ',
			}, 'customer_id'),
			queryOption({
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Exact name of the file',
			}),
			queryOption({
				displayName: 'Name Contains',
				name: 'nameContains',
				type: 'string',
				default: '',
			}, 'name__contains'),
		],
	},

	// Upload
	customerBodyLocator(show(['upload']), 'The customer to link the file to'),
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name the file is listed under in Hyperline',
		displayOptions: show(['upload']),
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		...binaryInputProperty(show(['upload']), 'file'),
		routing: { send: { preSend: [sendMultipartFile('file')] } },
	},
];
