import {TableRow} from "./TableRow";

export interface TableConfig<T> {
  columnsCfg: ColumnConfig<T>[],
  indexCfg?: IndexConfig,
  filterCfg?: FilterConfig,
  actionCfg?: ActionConfig,
  selectionCfg?: SelectionConfig,
  pageableCfg?: PaginationConfig
}

export interface ColumnConfig<T> {
  /** column title text */
  name: string;

  /** column key in data source */
  key: string;

  /** return value to save in MatTableDataSource */
  valueConverter: (value: T) => any;
  sort?: SortConfig;
  headerView?: ColumnView<string>;
  valueView?: ColumnView<(value: TableRow<T>) => string>;
}

export interface IconView<T> {
  /** icon name */
  name: T;

  /** icon color default black */
  color?: T;

  /** icon tooltip if null disabled */
  tooltip?: T;

  position?: 'right' | 'left';
}

export interface TextView<T> {
  /** default true*/
  show?: boolean;
  /** tooltip */
  tooltip?: T;
  color?: T;
}

export interface ColumnView<T> {

  /** settings for icon in column */
  icon?: IconView<T>;

  text?: TextView<T>;
}

export interface SortConfig {
  position?: 'right' | 'left';
  enable: true;
}

export interface IndexConfig {
  enable: true,

  /** смещение для первого индекса например 1 чтобы нумерация началась с 1 по умолчанию от нуля */
  offset?: number,

  headerColumn?: ColumnView<string>

  /** название для колонки, по умолчанию ''*/
  name?: string;
}

export interface FilterConfig {
  enable: true;
}

export interface ActionConfig {
  actions: Action[];
  position?: 'start' | 'end';
}

export interface Action {
  action: string;
  icon: IconView<string>;
}

export interface SelectionConfig {
  position?: 'start' | 'end';
  multiple?: boolean;
  enable: true;
}

export interface PaginationConfig {
  enable: true;
  sizes?: number[];
  size?: number;
}
