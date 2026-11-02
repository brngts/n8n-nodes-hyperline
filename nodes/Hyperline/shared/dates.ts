import type { INodeProperties } from 'n8n-workflow';

/**
 * n8n date pickers give local times without an offset, such as
 * `2026-01-31T00:00:00`, in the workflow's timezone. Hyperline takes UTC
 * timestamps ending in `Z`, so date-time values are read in the workflow
 * timezone and sent in UTC. Values that do not parse are sent unchanged so
 * Hyperline can report them, and empty values are left out.
 */
export const UTC_DATE_TIME_VALUE =
	'={{ $value === "" || $value === null || $value === undefined ? undefined : DateTime.fromISO(String($value)).isValid ? DateTime.fromISO(String($value)).toUTC().toISO() : $value }}';

/**
 * Sends a date picker value as a calendar date (`2026-01-31`), for fields that
 * take a date without a time. The date is kept as written, whatever its offset.
 */
export const DATE_VALUE =
	'={{ $value === "" || $value === null || $value === undefined ? undefined : DateTime.fromISO(String($value), { setZone: true }).isValid ? DateTime.fromISO(String($value), { setZone: true }).toISODate() : $value }}';

type DateOption = Omit<INodeProperties, 'routing' | 'type'>;

/** A date-time parameter or collection entry sent as one query parameter, in UTC. */
export function dateQueryOption(option: DateOption, property = option.name): INodeProperties {
	return {
		...option,
		type: 'dateTime',
		routing: { send: { type: 'query', property, value: UTC_DATE_TIME_VALUE } },
	};
}

/** A date-time parameter or collection entry sent as one body field, in UTC. */
export function dateBodyOption(option: DateOption, property = option.name): INodeProperties {
	return {
		...option,
		type: 'dateTime',
		routing: { send: { type: 'body', property, value: UTC_DATE_TIME_VALUE } },
	};
}

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?)?$/;

/** Minutes `timeZone` is ahead of UTC at `instant`. */
function offsetMinutes(instant: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(new Date(instant));
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((entry) => entry.type === type)?.value ?? 0);
	const wallClock = Date.UTC(
		part('year'),
		part('month') - 1,
		part('day'),
		part('hour'),
		part('minute'),
		part('second'),
	);
	return Math.round((wallClock - Math.floor(instant / 1000) * 1000) / 60000);
}

/**
 * The conversion `UTC_DATE_TIME_VALUE` does, for values handled in code such as
 * fixed collection rows: local times are read in `timeZone` (the workflow
 * timezone), values with an offset keep their instant, and anything that does
 * not parse is returned unchanged.
 */
export function toUtcIso(value: string, timeZone: string): string {
	const local = LOCAL_DATE_TIME.exec(value.trim());
	try {
		if (local) {
			const [, year, month, day, hour = '0', minute = '0', second = '0', millis = '0'] = local;
			const wallClock = Date.UTC(
				Number(year),
				Number(month) - 1,
				Number(day),
				Number(hour),
				Number(minute),
				Number(second),
				Number(millis.padEnd(3, '0')),
			);
			const firstGuess = wallClock - offsetMinutes(wallClock, timeZone) * 60000;
			// A second pass picks up a daylight saving change between the guess and the result.
			return new Date(wallClock - offsetMinutes(firstGuess, timeZone) * 60000).toISOString();
		}
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
	} catch {
		return value;
	}
}
