import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Mobil kartada yashirish */
  hideOnMobile?: boolean;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Mobil karta ko'rinishi uchun asosiy satr */
  renderMobileCard?: (row: T) => ReactNode;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  renderMobileCard,
}: TableProps<T>) {
  return (
    <>
      {/* Desktop jadval */}
      <div
        className={`overflow-x-auto rounded-card border border-line bg-card ${
          renderMobileCard ? "hidden md:block" : ""
        }`}
      >
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-2xs font-medium uppercase tracking-wide text-faint"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-line last:border-b-0 ${
                  onRowClick
                    ? "cursor-pointer transition-colors duration-150 hover:bg-card-hover"
                    : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-ink">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobil kartalar */}
      {renderMobileCard && (
        <div className="flex flex-col gap-3 md:hidden">
          {rows.map((row) => (
            <div
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`rounded-card border border-line bg-card p-4 ${
                onRowClick
                  ? "cursor-pointer transition-colors duration-150 hover:bg-card-hover"
                  : ""
              }`}
            >
              {renderMobileCard(row)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
