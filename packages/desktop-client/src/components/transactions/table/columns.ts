// The set of columns in the transaction table, in their default order.
export const TRANSACTION_TABLE_COLUMN_IDS = [
  'date',
  'account',
  'payee',
  'notes',
  'category',
  'payment',
  'deposit',
  'balance',
  'cleared',
] as const;

export type TransactionTableColumnId =
  (typeof TRANSACTION_TABLE_COLUMN_IDS)[number];

export type TransactionTableColumn = {
  id: TransactionTableColumnId;
  hidden: boolean;
};

// Columns that can be reordered but never hidden. The date column drives
// keyboard navigation (new transactions start editing on the date field) so
// it must always be visible.
const LOCKED_COLUMN_IDS: readonly TransactionTableColumnId[] = ['date'];

export function isTransactionTableColumnLocked(
  id: TransactionTableColumnId,
): boolean {
  return LOCKED_COLUMN_IDS.includes(id);
}

export function getDefaultTransactionTableColumns(): TransactionTableColumn[] {
  return TRANSACTION_TABLE_COLUMN_IDS.map(id => ({ id, hidden: false }));
}

function isKnownColumnId(id: unknown): id is TransactionTableColumnId {
  return (
    typeof id === 'string' &&
    (TRANSACTION_TABLE_COLUMN_IDS as readonly string[]).includes(id)
  );
}

/**
 * Parse the serialized column configuration from the synced pref. Invalid or
 * unknown entries are dropped, and any columns missing from the saved value
 * (e.g. because they were added in a later version, or were not available in
 * the view when it was saved) are inserted at their default position.
 */
export function parseTransactionTableColumns(
  raw: string | undefined,
): TransactionTableColumn[] {
  let saved: TransactionTableColumn[] = [];

  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (
            entry &&
            typeof entry === 'object' &&
            'id' in entry &&
            isKnownColumnId(entry.id) &&
            !saved.some(c => c.id === entry.id)
          ) {
            const hidden =
              'hidden' in entry &&
              entry.hidden === true &&
              !isTransactionTableColumnLocked(entry.id);
            saved.push({ id: entry.id, hidden });
          }
        }
      }
    } catch {
      // Malformed pref value; fall back to the defaults
      saved = [];
    }
  }

  // Insert any missing columns at their default relative position
  for (const id of TRANSACTION_TABLE_COLUMN_IDS) {
    if (saved.some(c => c.id === id)) {
      continue;
    }
    const defaultIdx = TRANSACTION_TABLE_COLUMN_IDS.indexOf(id);
    const insertAt = saved.findIndex(
      c => TRANSACTION_TABLE_COLUMN_IDS.indexOf(c.id) > defaultIdx,
    );
    const column = { id, hidden: false };
    if (insertAt === -1) {
      saved.push(column);
    } else {
      saved.splice(insertAt, 0, column);
    }
  }

  return saved;
}

export function serializeTransactionTableColumns(
  columns: TransactionTableColumn[],
): string {
  return JSON.stringify(columns);
}
