import {TableRow} from "./TableRow";

export interface TableConfig<T> {

  /**
   * Настройка колонок
   */
  columnsCfg: ColumnConfig<T>[],

  /**
   * Настройка отображения порядкового индекса строки в таблице
   */
  indexCfg?: IndexConfig,

  /**
   * Настройка отображения строки поиска в таблице
   */
  filterCfg?: FilterConfig,

  /**
   * Настройка отображения кнопок для совершения действий с объктом в строке
   */
  actionCfg?: ActionConfig,

  /**
   * Настройка для отображения чекбоксов
   */
  selectionCfg?: SelectionConfig,

  /**
   * Настройка пагинации таблицы
   */
  pageableCfg?: PaginationConfig,
  clickCfg?: ClickConfig,
  stickyCfg?: StickyConfig,
  tableView?: TableView,
}

export interface ClickConfig {
  /**
  * Show pointer on hovered row
  */
  pointer?: boolean;
  highlightClicked?: DecorStyles;

  /**
   * default false
   * false первое и второе нажатие генерирует событие с этой строкой выделение со строки не снимается
   *
   * если true первое нажатие генерирует событие с этой строкой, второе нажатие вернет undefined,
   * первое нажатие выделяет строку второе отменяет выделение
   */
  cancelable?: boolean;
}

export interface DecorStyles {
  color?: string;
  background?: string;
  border?: string;
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

  wrapper?: IconWrapper<T>;
}

export interface IconWrapper<T> {
  color: T;
}

export interface ImageView<T> {
  src: T;
  width?: string;
  height?: string;
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

  image?: ImageView<T>

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
  enable: boolean;
  label?: string;
  placeholder?: string;
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
  enable: boolean;
}

export interface PaginationConfig {
  enable: true;
  sizes?: number[];
  size?: number;
}

export interface StickyConfig {
  header: boolean;
}

export interface TableView {
  height?: string;
  minHeight?: string;
  maxHeight?: string;
}
