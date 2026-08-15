/**
 * Utility function to format dates uniformly across all UI modules as dd/mm/yyyy.
 */
export const formatDate = (dateInput?: string | Date | number | null): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Utility function to format day numbers into ordinal words (e.g. 1 -> "first (1st)", 28 -> "twenty-eighth (28th)")
 */
export const formatOrdinalDay = (dayInput?: number | string | null): string => {
  if (dayInput === undefined || dayInput === null || dayInput === '') return '...................';
  const num = typeof dayInput === 'string' ? parseInt(dayInput, 10) : dayInput;
  if (isNaN(num)) return String(dayInput);

  const ordinalWords: Record<number, string> = {
    1: 'first (1st)',
    2: 'second (2nd)',
    3: 'third (3rd)',
    4: 'fourth (4th)',
    5: 'fifth (5th)',
    6: 'sixth (6th)',
    7: 'seventh (7th)',
    8: 'eighth (8th)',
    9: 'ninth (9th)',
    10: 'tenth (10th)',
    11: 'eleventh (11th)',
    12: 'twelfth (12th)',
    13: 'thirteenth (13th)',
    14: 'fourteenth (14th)',
    15: 'fifteenth (15th)',
    16: 'sixteenth (16th)',
    17: 'seventeenth (17th)',
    18: 'eighteenth (18th)',
    19: 'nineteenth (19th)',
    20: 'twentieth (20th)',
    21: 'twenty-first (21st)',
    22: 'twenty-second (22nd)',
    23: 'twenty-third (23rd)',
    24: 'twenty-fourth (24th)',
    25: 'twenty-fifth (25th)',
    26: 'twenty-sixth (26th)',
    27: 'twenty-seventh (27th)',
    28: 'twenty-eighth (28th)',
    29: 'twenty-ninth (29th)',
    30: 'thirtieth (30th)',
    31: 'thirty-first (31st)',
  };

  return ordinalWords[num] || `${num}th`;
};

/**
 * Sanitizes backend raw database/SQL error messages into simple, clean user-facing error text.
 */
export const sanitizeErrorMessage = (rawError?: string | null): string => {
  if (!rawError) return 'An unexpected error occurred. Please try again.';
  const str = String(rawError);

  if (
    str.includes('Failed query:') ||
    str.includes('insert into') ||
    str.includes('update ') ||
    str.includes('delete from') ||
    str.includes('select ') ||
    str.includes('values (') ||
    str.includes('violates unique constraint') ||
    str.includes('duplicate key')
  ) {
    if (str.includes('unique constraint') || str.includes('duplicate key') || str.includes('code')) {
      return 'A record with this code or unique identifier already exists.';
    }
    return 'A system database error occurred. Please check your inputs and try again.';
  }

  return str;
};
