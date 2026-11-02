import type { INodeProperties } from 'n8n-workflow';

/**
 * Routing value for date parameters. Hyperline's date parameters take UTC
 * timestamps ending in `Z`, while n8n date pickers give local times without an
 * offset, so the value is read in the workflow timezone and converted to UTC.
 */
export const UTC_DATE_VALUE =
	'={{ $value ? (DateTime.fromISO(String($value)).toUTC().toISO() ?? $value) : undefined }}';

type DateOption = Omit<INodeProperties, 'routing' | 'type'>;

/** A date parameter or collection entry sent as one query parameter in UTC. */
export function dateQueryOption(option: DateOption, property = option.name): INodeProperties {
	return {
		...option,
		type: 'dateTime',
		routing: { send: { type: 'query', property, value: UTC_DATE_VALUE } },
	};
}

/** A date parameter or collection entry sent as one body field in UTC. */
export function dateBodyOption(option: DateOption, property = option.name): INodeProperties {
	return {
		...option,
		type: 'dateTime',
		routing: { send: { type: 'body', property, value: UTC_DATE_VALUE } },
	};
}
