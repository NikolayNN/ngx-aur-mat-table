export interface TableConfig<T> {
  /** column title text */
  name: string;

  /** column key in data source */
  key: string;
  sort?: SortConfig;
  headerColumn?: ColumnConfig<string>;
  valueColumn?: ColumnConfig<(value: T) => string>;
}

export interface IconConfig<T> {
  /** icon name */
  name: T;

  /** icon color default black */
  color?: T;

  /** icon tooltip if null disabled */
  tooltip?: T;

  position?: 'right' | 'left';
}

export interface TextConfig<T> {
  /** default true*/
  show?: boolean;
  /** tooltip */
  tooltip?: T;
  color?: T;
}

export interface ColumnConfig<T> {

  /** settings for icon in column */
  icon?: IconConfig<T>;

  text?: TextConfig<T>;
}

export interface SortConfig {
  position?: 'right' | 'left';
  enable?: boolean;
}
