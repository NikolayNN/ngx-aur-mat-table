import { TableRow } from './TableRow';

/** Контекст, передаваемый в кастомный шаблон ячейки (ngxAurCellDef). */
export interface AurCellContext<T = any> {
  /** Значение колонки = row[key] (то же, что получает lib-column-view). */
  $implicit: any;
  /** Именованный алиас $implicit (для let-value="value"). */
  value: any;
  /** Строка таблицы: .rowSrc — исходный объект T, .id — индекс строки. */
  row: TableRow<T>;
  /** Удобный алиас row.rowSrc. */
  rowSrc: T;
  /** Индекс строки = row.id. */
  index: number;
}
