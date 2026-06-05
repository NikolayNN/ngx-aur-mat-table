import {TableRow} from "./TableRow";
import {AurDragDropManager} from "../drag-drop/aur-drag-drop.manager";
import {StyleBuilder} from "../style-builder/style-builder";

export interface TableConfig<T> {

  /**
   * имя таблицы используется в drag & drop
   */
  name?: string,

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
  actionCfg?: ActionConfig<T>,

  /**
   * Настройка для отображения чекбоксов
   */
  selectionCfg?: SelectionConfig<T>,

  /**
   * Настройка пагинации таблицы
   */
  pageableCfg?: PaginationConfig,
  stickyCfg?: StickyConfig,
  tableView?: TableView,
  tableHeaderButtonCfg?: TableHeaderButtonConfig,
  dragCfg?: DragDropConfig,
  totalRowCfg?: TotalRowConfig<T>,
  timelineCfg?: TimelineConfig<T>,
  headerRowCfg?: HeaderRowConfig,
  bodyRowCfg?: BodyRowConfig<T>,

}

export interface ClickConfig {
  /** highlight style applied to the clicked/highlighted row; pointer moved to HoverConfig */
  highlightClicked?: StyleBuilder.Row | string;

  /**
   * default false
   * false: first and second click both emit this row; selection is not cleared.
   * true: first click emits this row, second click emits undefined; first selects, second deselects.
   */
  cancelable?: boolean;
}

export interface HoverConfig {
  /** master switch for the hover overlay; treated as true when hoverCfg is present and this is not false */
  enable?: boolean;
  /** show cursor: pointer on the body row */
  pointer?: boolean;
  /** style/class applied while the row is hovered (overlay, like highlight) */
  styleCfg?: HoverStyleConfig;
}

export interface HoverStyleConfig {
  class?: string;
  style?: StyleBuilder.Row | string;
}

export interface HeaderRowConfig {
  styleCfg?: HeaderStyleConfig;
}

export interface BodyRowConfig<T> {
  clickCfg?: ClickConfig;
  hoverCfg?: HoverConfig;
  styleCfg?: BodyStyleConfig<T>;
}

export interface HeaderStyleConfig {
  /** CSS class(es) on the main header <tr>. */
  class?: string;
  /** Inline style; a StyleBuilder.Row (built/un-built) or a raw CSS string. */
  style?: StyleBuilder.Row | string;
}

export interface BodyStyleConfig<T> {
  /** CSS class(es) on the body <tr mat-row>; space-separated allowed, e.g. 'total not-hover'. */
  class?: (row: TableRow<T>) => string | null;
  /** Inline style for the body <tr>; a StyleBuilder.Row or a raw CSS string. */
  style?: (row: TableRow<T>) => StyleBuilder.Row | string;
}

/** static value OR a function of the computed totals + source rows */
export type TotalHook<T, R> = R | ((totals: Map<string, any>, data: TableRow<T>[]) => R);

export interface TotalStyleConfig<T> {
  class?: TotalHook<T, string | null>;
  style?: TotalHook<T, StyleBuilder.Row | string>;
}

export interface ColumnConfig<T> {
  /** column title text */
  name: string;

  /** column key in data source */
  key: string;

  /** return value to save in MatTableDataSource */
  valueConverter: (value: T) => any;
  sort?: SortConfig<T>;
  headerView?: ColumnView<string>;
  valueView?: ColumnView<(value: TableRow<T>) => string>;
  totalConverter?: (value: TableRow<T>[]) => any;
  size?: ColumnSize;
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

  // принимает значения 'show' | 'none'
  // 'show' или не указан -  показать иконку
  //
  display?: T;
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

export interface SortConfig<T> {
  enable: boolean;
  position?: 'right' | 'left';

  /**
   * column key
   */
  customSort?: (data: TableRow<T>, key: string) => any;
}

export interface IndexConfig {
  enable: boolean,

  /** смещение для первого индекса например 1 чтобы нумерация началась с 1 по умолчанию от нуля */
  offset?: number,

  headerColumn?: ColumnView<string>

  /** название для колонки, по умолчанию ''*/
  name?: string;
  size?: ColumnSize;
}

export interface FilterConfig {
  enable: boolean;
  label?: string;
  placeholder?: string;
}

export interface ActionConfig<T> {
  enable?: boolean;
  actions: Action<(value: T) => string>[];
  position?: 'start' | 'end';
  size?: ColumnSize;
}

export interface Action<T> {
  action: T;
  icon: IconView<T>;
  display?: T;
  menu?: MenuItem<T>[];
}

export interface MenuItem<T> {
  /** action code emitted via rowAction */
  action: T;
  /** menu item label text */
  text: T;
  /** optional leading icon */
  icon?: IconView<T>;
  /** 'show' | 'none' — conditionally hide the item */
  display?: T;
  /** 'true' | 'false' — conditionally disable the item */
  disabled?: T;
}

export interface SelectionConfig<T> {
  position?: 'start' | 'end';
  multiple?: boolean;
  showSelectedCount?: boolean;
  compareWith?: (o1: T, o2: T) => boolean
  // default: true, показывать
  showTotalCount?: boolean;
  enable: boolean;
  actions?: Action<string>[];
  size?: ColumnSize;
}

export interface PaginationConfig {
  enable: boolean;
  size: number;
  sizes?: number[];
  style?: string;
  position?: 'under' | 'bottom';
  /** 'client' (default) lets MatTableDataSource slice in memory; 'server' uses pageSource / paginatorState. */
  mode?: 'client' | 'server';
}

export interface StickyConfig {
  header?: boolean;
  total?: boolean;
  subFooter?: boolean;
}

export interface TableView {
  height?: string;
  minHeight?: string;
  maxHeight?: string;
}

export interface ColumnSize {
  width?: string;
  minWidth?: string;
  maxWidth?: string;
}

export interface TableHeaderButtonConfig {
  enable: boolean;
  icon?: string;
  color?: string;
  background?: string;
}

export interface DragDropConfig {
  enable: boolean;
  manager: AurDragDropManager;
  multiple?: boolean;
  dragIcon?: IconView<string>;
  size?: ColumnSize;
}

export interface TotalRowConfig<T> {
  enable: boolean;
  styleCfg?: TotalStyleConfig<T>;
}

export interface TimelineLineConfig {
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  gapStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
}

export interface TimelineConfig<T = any> {
  enable: boolean;
  markerColor?: string;
  line?: TimelineLineConfig;
  segmentColor?: (prev: TableRow<T>, next: TableRow<T>) => string;
  size?: ColumnSize;
}
