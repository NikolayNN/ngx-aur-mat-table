import { TableRow } from './TableRow';

/** Контекст row-level шаблонов (ngxAurExpandedRowDef / ngxAurRowMarkerDef). */
export interface AurRowContext<T = any> {
  /** Исходный объект строки (row.rowSrc). */
  $implicit: T;
  /** Строка таблицы: .rowSrc — исходный объект T, .rowId — индекс строки. */
  row: TableRow<T>;
  /** Удобный алиас row.rowSrc. */
  rowSrc: T;
  /** Индекс строки = row.rowId. */
  index: number;
}
