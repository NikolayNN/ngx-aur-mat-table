import { ColumnConfig } from './ColumnConfig';
import { NgxAurFilters } from '../filters/NgxAurFilters';

/** Хэндл сортировки колонки в контексте header-шаблона (ngxAurHeaderCellDef). */
export interface AurHeaderSortHandle {
  /** Колонка сконфигурирована сортируемой (ColumnConfig.sort активен). */
  sortable: boolean;
  /** Эта колонка — текущая активная сортировка. */
  active: boolean;
  /** Текущее направление: 'asc' | 'desc' | '' ('' когда колонка не активна). */
  direction: 'asc' | 'desc' | '';
  /** Переключить сортировку по этой колонке (asc → desc → clear → …). */
  toggle: () => void;
}

/** Хэндл фильтра колонки (обёртка над публичным applyFilter/removeFilter, filterName = column.key). */
export interface AurHeaderFilterHandle<T = any> {
  /** Применить фильтр к этой колонке (filterName = column.key). */
  apply: (filter: NgxAurFilters.Base<T>) => void;
  /** Снять фильтр этой колонки. */
  remove: () => void;
  /** Активен ли сейчас фильтр этой колонки (filterStorage.has(key)). */
  active: boolean;
}

/** Контекст, передаваемый в кастомный шаблон заголовка (ngxAurHeaderCellDef). */
export interface AurHeaderCellContext<T = any> {
  /** Конфиг колонки (для let-column). */
  $implicit: ColumnConfig<T>;
  /** Именованный алиас $implicit. */
  column: ColumnConfig<T>;
  /** Ключ колонки (ColumnConfig.key). */
  key: string;
  /** Хэндл сортировки колонки. */
  sort: AurHeaderSortHandle;
  /** Хэндл фильтра колонки. */
  filter: AurHeaderFilterHandle<T>;
}
