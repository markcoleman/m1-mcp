/** Default number of days to retrieve transactions */
export const DEFAULT_TRANSACTION_DAYS = 30;
/** Maximum number of days supported by Members1st API (no paging available) */
export const MAX_TRANSACTION_DAYS = 180;

export type TransactionSearchOptions = {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
};

export type NormalizedTransactionSearch = {
  startDate: string;
  endDate: string;
};

export function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIsoDateOnly(s: string): Date | undefined {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export function normalizeTransactionSearchOptions(opts: TransactionSearchOptions): NormalizedTransactionSearch {
  const endDate = opts.endDate ?? isoDateOnly(new Date());

  const startDate =
    opts.startDate ??
    (() => {
      const end = parseIsoDateOnly(endDate) ?? new Date();
      const d = new Date(end);
      d.setUTCDate(d.getUTCDate() - DEFAULT_TRANSACTION_DAYS);
      return isoDateOnly(d);
    })();

  return {
    startDate,
    endDate
  };
}

/**
 * Calculates the number of days between two dates using UTC date arithmetic.
 * This avoids issues with daylight saving time transitions.
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Number of days between the dates (positive if endDate >= startDate)
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = parseIsoDateOnly(startDate);
  const end = parseIsoDateOnly(endDate);
  
  // If either date is invalid, return a safe default
  if (!start || !end) {
    return DEFAULT_TRANSACTION_DAYS;
  }
  
  // Use UTC date parts to avoid DST issues
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  
  const diffMs = endUtc - startUtc;
  
  // If start is after end, return 0 (invalid range)
  if (diffMs < 0) {
    return 0;
  }
  
  // Calculate days (milliseconds / ms per day)
  // Use Math.floor since we're dealing with whole UTC days
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Chunks a date range into segments of at most MAX_TRANSACTION_DAYS days.
 * Each chunk covers exactly MAX_TRANSACTION_DAYS days (inclusive) except the last chunk.
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of date range chunks, each with startDate and endDate
 */
export function chunkDateRange(startDate: string, endDate: string): Array<{ startDate: string; endDate: string }> {
  const totalDays = daysBetween(startDate, endDate);
  
  if (totalDays <= MAX_TRANSACTION_DAYS) {
    return [{ startDate, endDate }];
  }

  const chunks: Array<{ startDate: string; endDate: string }> = [];
  const parsedStart = parseIsoDateOnly(startDate);
  const parsedEnd = parseIsoDateOnly(endDate);
  
  // If dates are invalid, return a single chunk with the original dates
  if (!parsedStart || !parsedEnd) {
    return [{ startDate, endDate }];
  }
  
  let currentStart = parsedStart;
  const finalEnd = parsedEnd;

  while (currentStart <= finalEnd) {
    // Calculate the end of this chunk (MAX_TRANSACTION_DAYS - 1 to make it inclusive)
    // E.g., start on day 0, add 179 days = day 179, which is 180 days inclusive
    const chunkEnd = new Date(currentStart);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + MAX_TRANSACTION_DAYS - 1);
    
    // The actual end is either the chunk end or the final end, whichever is earlier
    const actualEnd = chunkEnd > finalEnd ? finalEnd : chunkEnd;
    
    chunks.push({
      startDate: isoDateOnly(currentStart),
      endDate: isoDateOnly(actualEnd)
    });
    
    // If we've reached or passed the final end, we're done
    if (actualEnd >= finalEnd) {
      break;
    }
    
    // Move to the next chunk (day after the end of this chunk)
    currentStart = new Date(actualEnd);
    currentStart.setUTCDate(currentStart.getUTCDate() + 1);
  }

  return chunks;
}

export function toIsoDateOnly(v: unknown): string {
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return isoDateOnly(d);
    return v;
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) return isoDateOnly(v);
  return isoDateOnly(new Date());
}
