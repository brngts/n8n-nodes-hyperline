/**
 * Date pickers return local times such as `2026-01-31T00:00:00`, while Hyperline's
 * date-time filters only accept UTC timestamps ending in `Z`. Values that do not
 * parse are sent unchanged so Hyperline can report them.
 */
export const UTC_DATE_TIME_VALUE =
	'={{ $value === "" ? undefined : DateTime.fromISO(String($value)).isValid ? DateTime.fromISO(String($value)).toUTC().toISO() : $value }}';

/**
 * Sends a date picker value as a calendar date (`2026-01-31`), for fields that
 * take a date without a time. The date is kept as written, whatever its offset.
 */
export const DATE_VALUE =
	'={{ $value === "" ? undefined : DateTime.fromISO(String($value), { setZone: true }).isValid ? DateTime.fromISO(String($value), { setZone: true }).toISODate() : $value }}';
