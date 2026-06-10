import {TableRow} from "./TableRow";
import {AurDragDropManager} from "../drag-drop/aur-drag-drop.manager";
import {StyleBuilder} from "../style-builder/style-builder";

/**
 * Сопоставляет дженерик листового типа `T` с разрешённым значением:
 * - когда `T` — простое значение (например, `string`), разрешается в `R`;
 * - когда `T` — резолвер `(value) => string`, разрешается в `(value) => R`.
 * Используется для управляющих полей, тип значения которых должен быть `boolean`, а не листовая строка.
 */
export type Resolvable<T, R> = T extends (arg: infer A) => any ? (arg: A) => R : R;

export interface TableConfig<T> {

  /**
   * Имя таблицы, используется в drag & drop
   */
  name?: string,

  /**
   * Ключ идентичности строки для переиспользования DOM (trackBy).
   * По умолчанию строки сравниваются по ссылке на исходный объект (rowSrc):
   * этого достаточно, когда объекты стабильны (пересортировка, точечная замена).
   * Задайте бизнес-ключ (например, item => item.id), если объекты пересоздаются
   * при каждой загрузке (типичный HTTP-ответ) — тогда DOM строк переиспользуется
   * и для «свежих» объектов. Ключ должен быть уникален в пределах данных.
   * Дубликаты или undefined/null-ключи не ломают рендер — деградирует только
   * точность переиспользования DOM (совпадающие ключи матчатся позиционно).
   */
  trackBy?: (item: T) => unknown,

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
   * Настройка отображения кнопок для совершения действий с объектом в строке
   */
  actionCfg?: ActionConfig<T>,

  /**
   * Настройка для отображения чекбоксов
   */
  selectionCfg?: SelectionConfig<T>,

  /**
   * Настройка пагинации таблицы
   */
  paginationCfg?: PaginationConfig,
  stickyCfg?: StickyConfig,
  tableViewCfg?: TableViewConfig,
  headerButtonCfg?: HeaderButtonConfig,
  dragDropCfg?: DragDropConfig,
  totalRowCfg?: TotalRowConfig<T>,
  timelineCfg?: TimelineConfig<T>,
  headerRowCfg?: HeaderRowConfig,
  bodyRowCfg?: BodyRowConfig<T>,

}

export interface ClickConfig {
  /**
   * Стиль/класс, применяемый к кликнутой/подсвеченной строке.
   * Цвет текста ячеек при class задаётся селектором потребителя,
   * например `tr.my-highlight td { color: white; }`.
   */
  styleCfg?: ClickStyleConfig;

  /**
   * По умолчанию false
   * false: и первый, и второй клик испускают эту строку; выделение не сбрасывается.
   * true: первый клик испускает эту строку, второй клик испускает undefined; первый выделяет, второй снимает выделение.
   */
  cancelable?: boolean;
}

export interface ClickStyleConfig {
  /** CSS-класс(ы) на подсвеченном <tr>; допускается несколько через пробел. */
  class?: string;
  /** Инлайн-стиль; StyleBuilder.Row или сырая CSS-строка. */
  style?: StyleBuilder.Row | string;
}

export interface HoverConfig {
  /** Главный переключатель оверлея наведения; считается true, когда hoverCfg задан и это значение не false */
  enable?: boolean;
  /** Показывать cursor: pointer на строке тела */
  pointer?: boolean;
  /** Стиль/класс, применяемый при наведении на строку (оверлей, как подсветка) */
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
  /** CSS-класс(ы) на основном <tr> заголовка. */
  class?: string;
  /** Инлайн-стиль; StyleBuilder.Row (собранный/несобранный) или сырая CSS-строка. */
  style?: StyleBuilder.Row | string;
}

export interface BodyStyleConfig<T> {
  /** CSS-класс(ы) на <tr mat-row> тела; допускается разделение пробелами, например 'total not-hover'. */
  class?: (row: TableRow<T>) => string | null;
  /** Инлайн-стиль для <tr> тела; StyleBuilder.Row или сырая CSS-строка. */
  style?: (row: TableRow<T>) => StyleBuilder.Row | string;
}

/** Статичное значение ИЛИ функция от вычисленных итогов + исходных строк */
export type TotalHook<T, R> = R | ((totals: Map<string, any>, data: TableRow<T>[]) => R);

export interface TotalStyleConfig<T> {
  class?: TotalHook<T, string | null>;
  style?: TotalHook<T, StyleBuilder.Row | string>;
}

/** Горизонтальное выравнивание контента колонки. */
export type ColumnAlign = 'left' | 'center' | 'right';

export interface ColumnConfig<T> {
  /** Текст заголовка колонки */
  name: string;

  /** Ключ колонки в источнике данных */
  key: string;

  /** Значение для сохранения в MatTableDataSource */
  valueConverter: (value: T) => any;
  sort?: SortConfig<T>;
  headerView?: ColumnView<string>;
  valueView?: ColumnView<(value: TableRow<T>) => string>;
  totalConverter?: (value: TableRow<T>[]) => any;
  size?: ColumnSize;
  /** Выравнивание заголовка, ячеек и итога колонки. По умолчанию 'left'. */
  align?: ColumnAlign;
}

export interface IconView<T> {
  /** Имя иконки */
  name: T;

  /** Цвет иконки, по умолчанию black */
  color?: T;

  /** Подсказка иконки, если null — выключена */
  tooltip?: T;

  wrapper?: IconWrapper<T>;

  /** Показать иконку. `undefined`/`true` → показана, `false` → скрыта. */
  visible?: Resolvable<T, boolean>;
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
  /** По умолчанию true*/
  show?: boolean;
  /** Подсказка */
  tooltip?: T;
  color?: T;
}

export interface ColumnView<T> {

  /** Настройка иконки в колонке */
  icon?: IconView<T>;

  image?: ImageView<T>

  text?: TextView<T>;
}

export interface SortConfig<T> {
  /** Включить сортировку на этой колонке. По умолчанию включено, когда задан `sort`; `false` выключает. */
  enable?: boolean;
  position?: 'start' | 'end';

  /**
   * Ключ колонки
   */
  customSort?: (data: TableRow<T>, key: string) => any;
}

export interface IndexConfig {
  /** Показать колонку индекса. По умолчанию включено, когда задан `indexCfg`; `false` выключает. */
  enable?: boolean,

  /** Смещение для первого индекса, например 1, чтобы нумерация началась с 1, по умолчанию от нуля */
  offset?: number,

  headerColumn?: ColumnView<string>

  /** Название для колонки, по умолчанию ''*/
  name?: string;
  size?: ColumnSize;
  /** Выравнивание колонки индекса. По умолчанию 'left'. */
  align?: ColumnAlign;
  /** Форматирует отображаемый индекс (offset уже применён), например i => `${i}.` */
  formatter?: (index: number) => string;
}

export interface FilterConfig {
  /** Показать строку фильтра. По умолчанию включено, когда задан `filterCfg`; `false` выключает. */
  enable?: boolean;
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
  /** Показать действие. `undefined`/`true` → показано, `false` → скрыто. */
  visible?: Resolvable<T, boolean>;
  menu?: MenuItem<T>[];
}

export interface MenuItem<T> {
  /** Код действия, испускаемый через rowAction */
  action: T;
  /** Текст подписи пункта меню */
  text: T;
  /** Необязательная ведущая иконка */
  icon?: IconView<T>;
  /** Показать пункт. `undefined`/`true` → показан, `false` → скрыт. */
  visible?: Resolvable<T, boolean>;
  /** Выключить пункт. `undefined`/`false` → включён, `true` → выключен. */
  disabled?: Resolvable<T, boolean>;
}

export interface SelectionConfig<T> {
  position?: 'start' | 'end';
  multiple?: boolean;
  showSelectedCount?: boolean;
  compareWith?: (o1: T, o2: T) => boolean
  // по умолчанию: true, показывать
  showTotalCount?: boolean;
  /** Включить выделение. По умолчанию включено, когда задан `selectionCfg`; `false` выключает. */
  enable?: boolean;
  actions?: Action<string>[];
  size?: ColumnSize;
}

export interface PaginationConfig {
  /** Включить пагинацию. По умолчанию включено, когда задан `paginationCfg`; `false` выключает. */
  enable?: boolean;
  size: number;
  sizes?: number[];
  style?: string;
  position?: 'inline' | 'sticky';
  /** 'client' (по умолчанию) позволяет MatTableDataSource нарезать в памяти; 'server' использует pageSource / paginatorState. */
  mode?: 'client' | 'server';
}

export interface StickyConfig {
  header?: boolean;
  total?: boolean;
  subFooter?: boolean;
}

export interface TableViewConfig {
  height?: string;
  minHeight?: string;
  maxHeight?: string;
}

export interface ColumnSize {
  width?: string;
  minWidth?: string;
  maxWidth?: string;
}

export interface HeaderButtonConfig {
  /** Показать кнопку заголовка. По умолчанию включено, когда задан `headerButtonCfg`; `false` выключает. */
  enable?: boolean;
  icon?: string;
  color?: string;
  background?: string;
}

export interface DragDropConfig {
  /** Включить drag & drop. По умолчанию включено, когда задан `dragDropCfg`; `false` выключает. */
  enable?: boolean;
  manager: AurDragDropManager;
  multiple?: boolean;
  dragIcon?: IconView<string>;
  size?: ColumnSize;
}

export interface TotalRowConfig<T> {
  /** Показать строку итогов. По умолчанию включено, когда какая-либо колонка определяет `totalConverter`; `false` выключает. */
  enable?: boolean;
  styleCfg?: TotalStyleConfig<T>;
  /**
   * Показывать строку итогов на каждой странице пагинации.
   * default false — итоги показываются ТОЛЬКО на последней странице (поведение по умолчанию).
   * true — итоги показываются на каждой странице (прежнее поведение до 19.3.0).
   * Если пагинация выключена — итоги показываются всегда (опция не влияет).
   */
  showOnEveryPage?: boolean;
}

export interface TimelineLineConfig {
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  gapStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
}

export interface TimelineConfig<T = any> {
  /** Включить колонку таймлайна. По умолчанию включено, когда задан `timelineCfg`; `false` выключает. */
  enable?: boolean;
  markerColor?: string;
  line?: TimelineLineConfig;
  segmentColor?: (prev: TableRow<T>, next: TableRow<T>) => string;
  size?: ColumnSize;
}
