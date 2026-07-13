"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface MobileTableColumn<T> {
  /** Unique key for the column. */
  key: string;
  /** Header label shown on desktop and as the field label on mobile cards. */
  header: React.ReactNode;
  /** Cell renderer. */
  cell: (row: T, index: number) => React.ReactNode;
  /** Alignment for the desktop table cell. */
  align?: "left" | "right" | "center";
  /** Desktop-only cell classes. */
  className?: string;
  /** Desktop-only header classes. */
  headerClassName?: string;
  /**
   * When true, this column is rendered as the primary title of the mobile
   * card (instead of being listed in the grid below).
   */
  cardTitle?: boolean;
  /**
   * When true, this column is rendered as the subtitle of the mobile card.
   */
  cardSubtitle?: boolean;
}

interface MobileTableProps<T> {
  columns: MobileTableColumn<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: React.ReactNode;
  className?: string;
}

/**
 * Renders a traditional <table> on desktop (md+) and stackable cards on
 * mobile. Pass `cardTitle`/`cardSubtitle` on columns to control the mobile
 * card layout.
 *
 * NOTE: Because `cell` render functions cannot be serialized across the
 * server/client boundary, this component must be rendered from a client
 * component (or a server component that passes no function props — not the
 * typical use case here).
 */
export function MobileTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  emptyMessage,
  className,
}: MobileTableProps<T>) {
  const alignClass = (a?: "left" | "right" | "center") =>
    a === "right"
      ? "text-right"
      : a === "center"
        ? "text-center"
        : "text-left";

  const detailColumns = columns.filter((c) => !c.cardTitle && !c.cardSubtitle);
  const titleCol = columns.find((c) => c.cardTitle);
  const subtitleCol = columns.find((c) => c.cardSubtitle);

  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "p-4 font-medium",
                    alignClass(col.align),
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={getRowKey(row, i)}
                onClick={
                  onRowClick ? () => onRowClick(row, i) : undefined
                }
                className={cn(
                  "border-b last:border-0 hover:bg-muted/30",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("p-4", alignClass(col.align), col.className)}
                  >
                    {col.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.map((row, i) => (
          <div
            key={getRowKey(row, i)}
            onClick={onRowClick ? () => onRowClick(row, i) : undefined}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-sm transition-transform active:scale-[0.99]",
              onRowClick && "cursor-pointer"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {titleCol && (
                  <div className="truncate font-medium">
                    {titleCol.cell(row, i)}
                  </div>
                )}
                {subtitleCol && (
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {subtitleCol.cell(row, i)}
                  </div>
                )}
              </div>
              {detailColumns[0] && (
                <div className="shrink-0 text-right">
                  {detailColumns[0].cell(row, i)}
                </div>
              )}
            </div>

            {detailColumns.length > 1 && (
              <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3">
                {detailColumns.slice(1).map((col) => (
                  <div key={col.key} className="text-sm">
                    <div className="text-xs text-muted-foreground">
                      {col.header}
                    </div>
                    <div className="mt-0.5">{col.cell(row, i)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {data.length === 0 && emptyMessage && (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
