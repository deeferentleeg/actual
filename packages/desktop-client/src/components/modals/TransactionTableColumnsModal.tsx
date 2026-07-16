import React, { useState } from 'react';
import type { DragItem } from 'react-aria';
import {
  DropIndicator,
  GridList,
  GridListItem,
  useDragAndDrop,
} from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgMenu } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Toggle } from '@actual-app/components/toggle';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import {
  getDefaultTransactionTableColumns,
  isTransactionTableColumnLocked,
} from '#components/transactions/table/columns';
import type {
  TransactionTableColumn,
  TransactionTableColumnId,
} from '#components/transactions/table/columns';
import type { Modal as ModalType } from '#modals/modalsSlice';

type TransactionTableColumnsModalProps = Extract<
  ModalType,
  { name: 'transaction-table-columns' }
>['options'];

function useColumnLabels(): Record<TransactionTableColumnId, string> {
  const { t } = useTranslation();

  return {
    date: t('Date'),
    account: t('Account'),
    payee: t('Payee'),
    notes: t('Notes'),
    category: t('Category'),
    payment: t('Payment'),
    deposit: t('Deposit'),
    balance: t('Running balance'),
    cleared: t('Cleared checkbox'),
  };
}

export function TransactionTableColumnsModal({
  columns: initialColumns,
  onSave,
}: TransactionTableColumnsModalProps) {
  const { t } = useTranslation();
  const columnLabels = useColumnLabels();

  const [columns, setColumns] =
    useState<TransactionTableColumn[]>(initialColumns);

  const onToggleColumn = (id: TransactionTableColumnId, isVisible: boolean) => {
    setColumns(prev =>
      prev.map(column =>
        column.id === id ? { ...column, hidden: !isVisible } : column,
      ),
    );
  };

  const onResetToDefault = () => {
    // Only reset the columns that are available in this view
    setColumns(
      getDefaultTransactionTableColumns().filter(column =>
        initialColumns.some(c => c.id === column.id),
      ),
    );
  };

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: keys =>
      [...keys].map(key => ({ 'text/plain': String(key) }) as DragItem),
    renderDropIndicator: target => (
      <DropIndicator
        target={target}
        className={css({
          '&[data-drop-target]': {
            height: 3,
            backgroundColor: theme.pageTextLink,
            opacity: 1,
            borderRadius: 3,
          },
        })}
      />
    ),
    renderDragPreview: items => {
      const columnId = items[0]['text/plain'] as TransactionTableColumnId;
      return (
        <View
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            backgroundColor: theme.tableBackground,
            border: '1px solid ' + theme.tableBorder,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          }}
        >
          <Text style={{ color: theme.tableText, fontWeight: 500 }}>
            {columnLabels[columnId]}
          </Text>
        </View>
      );
    },
    onReorder: e => {
      const [key] = e.keys;
      const targetId = e.target.key;

      setColumns(prev => {
        const moved = prev.find(c => c.id === key);
        if (!moved || key === targetId) {
          return prev;
        }

        const remaining = prev.filter(c => c.id !== key);
        const targetIdx = remaining.findIndex(c => c.id === targetId);
        if (targetIdx === -1) {
          return prev;
        }

        const insertAt =
          e.target.dropPosition === 'after' ? targetIdx + 1 : targetIdx;
        return [
          ...remaining.slice(0, insertAt),
          moved,
          ...remaining.slice(insertAt),
        ];
      });
    },
  });

  return (
    <Modal
      name="transaction-table-columns"
      containerProps={{ style: { width: 400 } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Table columns')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ gap: 15 }}>
            <Text style={{ color: theme.pageTextLight, lineHeight: 1.5 }}>
              <Trans>
                Choose which columns appear in the transaction table and drag
                them into the order you prefer.
              </Trans>
            </Text>

            <GridList
              aria-label={t('Transaction table columns')}
              items={columns}
              dragAndDropHooks={dragAndDropHooks}
              dependencies={[columnLabels]}
              className={css({ display: 'flex', flexDirection: 'column' })}
            >
              {column => (
                <ColumnListItem
                  key={column.id}
                  column={column}
                  label={columnLabels[column.id]}
                  onToggle={onToggleColumn}
                />
              )}
            </GridList>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Button variant="bare" onPress={onResetToDefault}>
                <Trans>Reset to default</Trans>
              </Button>
              <View style={{ flex: 1 }} />
              <Button onPress={() => state.close()}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  onSave(columns);
                  state.close();
                }}
              >
                <Trans>Save</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}

type ColumnListItemProps = {
  column: TransactionTableColumn;
  label: string;
  onToggle: (id: TransactionTableColumnId, isVisible: boolean) => void;
};

function ColumnListItem({ column, label, onToggle }: ColumnListItemProps) {
  const { t } = useTranslation();
  const isLocked = isTransactionTableColumnLocked(column.id);

  return (
    <GridListItem
      id={column.id}
      textValue={label}
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        marginBottom: 4,
        borderRadius: 6,
        border: '1px solid ' + theme.tableBorder,
        backgroundColor: theme.tableBackground,
        outline: 'none',
        '&[data-hovered]': {
          backgroundColor: theme.tableRowBackgroundHover,
        },
        '&[data-dragging]': {
          opacity: 0.5,
        },
        '&[data-focus-visible]': {
          boxShadow: '0 0 0 2px ' + theme.formInputBorderSelected,
        },
      })}
    >
      <Button
        slot="drag"
        variant="bare"
        aria-label={t('Reorder {{ columnName }} column', {
          columnName: label,
        })}
        style={{
          cursor: 'grab',
          color: theme.pageTextSubdued,
          padding: 4,
        }}
      >
        <SvgMenu width={12} height={12} />
      </Button>
      <Text
        style={{
          flex: 1,
          color: column.hidden ? theme.pageTextSubdued : theme.tableText,
        }}
      >
        {label}
      </Text>
      {isLocked ? (
        <Text
          style={{
            color: theme.pageTextSubdued,
            fontStyle: 'italic',
            fontSize: 12,
          }}
        >
          <Trans>Always shown</Trans>
        </Text>
      ) : (
        <Toggle
          id={`toggle-column-${column.id}`}
          isOn={!column.hidden}
          onToggle={isVisible => onToggle(column.id, isVisible)}
        />
      )}
    </GridListItem>
  );
}
