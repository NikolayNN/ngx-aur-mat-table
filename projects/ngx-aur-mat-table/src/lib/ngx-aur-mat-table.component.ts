import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  isDevMode,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewChildren,
  ViewContainerRef
} from '@angular/core';
import {ColumnAlign, ColumnView, RowValue, TableConfig} from './model/ColumnConfig';
import {StyleBuilder} from './style-builder/style-builder';
import {MatSort, Sort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {SelectionProvider, SelectionProviderDummy} from './providers/SelectionProvider';
import {ActionEvent, RowActionProvider, RowActionProviderDummy} from './providers/RowActionProvider';
import {TableRow} from "./model/TableRow";
import {TableViewFactory} from "./model/TableViewFactory";
import {ResolvedRowStyle, RowStyleFactory} from "./model/RowStyleFactory";
import {IndexProvider, IndexProviderDummy} from "./providers/IndexProvider";
import {PaginationProvider, PaginationProviderDummy} from "./providers/PaginationProvider";
import {TableRowsFactory} from "./factories/TableRowsFactory";
import {DisplayColumnsFactory} from "./factories/DisplayColumnsFactory";
import {TotalRowProvider, TotalRowProviderDummy} from "./providers/TotalRowProvider";
import {NgxAurFilters} from "./filters/NgxAurFilters";
import {NgxAurMatTablePublic} from "./ngx-aur-mat-table-public";
import {OffsetUtil} from "./utils/offset.util";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {NgxTableSubFooterRowDirective} from "./directive/ngx-table-sub-footer-row.directive";
import {SelectionModel} from "@angular/cdk/collections";
import {HeaderButtonProvider, HeaderButtonProviderDummy} from "./providers/HeaderButtonProvider";
import {DragDropProvider, DragProviderDummy} from "./providers/DragDropProvider";
import {TimelineProvider, TimelineProviderDummy} from "./providers/TimelineProvider";
import {AurDragDropComponent} from "./drag-drop/aur-drag-drop-component";
import {PaginatorState} from './model/PaginatorState';
export {PaginatorState} from './model/PaginatorState';
import {AurPageLoadedEvent, AurPageSource} from './model/AurPage';
import {ServerPageController} from './providers/ServerPageController';
import { isFeatureEnabled as isFeatureEnabledFn } from './utils/feature-enabled.util';
import {Subscription} from 'rxjs';
import {NgxAurCellDefDirective} from './directive/ngx-aur-cell-def.directive';
import {AurCellContext} from './model/AurCellContext';

export interface HighlightContainer<T> {
  value: any;
}

export interface ColumnOffset {
  left: number,
  width: number,
  key: string
}

enum ExpandState {
  COLLAPSED = 'collapsed',
  EXPANDED = 'expanded'
}

@Component({
    selector: 'aur-mat-table',
    templateUrl: './ngx-aur-mat-table.component.html',
    styleUrls: ['./ngx-aur-mat-table.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('detailExpand', [
            state(ExpandState.COLLAPSED, style({ height: '0px', minHeight: '0' })),
            state(ExpandState.EXPANDED, style({ height: '*' })),
            transition(`${ExpandState.EXPANDED} <=> ${ExpandState.COLLAPSED}`, animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ],
    standalone: false
})
export class NgxAurMatTableComponent<T> implements OnInit, OnChanges, AfterContentInit, AfterViewInit, OnDestroy, NgxAurMatTablePublic<T>, AurDragDropComponent<TableRow<T>> {

  expandedStateEnum = ExpandState;

  readonly EXTRA_HEADER_CELL_TOP_SUFFIX = '_extra_header_cell_top';
  readonly EXTRA_HEADER_CELL_BOTTOM_SUFFIX = '_extra_header_cell_bottom';

  public tableDataSource = new MatTableDataSource<TableRow<T>>([]);
  _displayColumns: string[] = [];
  _displayExtraHeaderTopCell: string[] = [];
  _displayExtraHeaderBottomCell: string[] = [];

  _customDisplayColumnsEnabled = false;

  _tableName = 'unknown-table-name';

  @Input() set displayColumns(columns: string[]) {
    if (columns) {
      this._displayColumns = [...columns];
      this._customDisplayColumnsEnabled = columns && columns.length > 0;
    }
  }

  tableView: Map<string, ColumnView<string>>[] = [];

  private rowStyles: ResolvedRowStyle[] = [];

  _headerStyle: string | null = null;
  _headerClass: string | null = null;
  _totalStyle: string | null = null;
  _totalClass: string | null = null;

  /**
   * Классы выравнивания по ключу колонки; 'left'/не задан → undefined (без класса).
   * Пересобирается в initTable() — как и _headerStyle/_headerClass/rowStyles, реагирует
   * на смену [tableData]/[displayColumns]; смена ОДНОГО лишь [tableConfig] (существующее
   * ограничение компонента) пересборку не запускает.
   */
  _alignClass: Record<string, 'aur-align-center' | 'aur-align-right' | undefined> = {};

  /** Строки интерактивны (clickCfg задан) → tabindex/клавиатурная активация. */
  _rowsInteractive = false;

  /** Смещение индекса строки на номер страницы в серверном режиме (pageIndex*pageSize); 0 в клиентском. */
  _indexPageOffset = 0;

  @ContentChild(NgxTableSubFooterRowDirective) subFooterRowTemplate: TemplateRef<any> | null | undefined;

  @ContentChildren(NgxAurCellDefDirective, {descendants: true})
  cellDefs!: QueryList<NgxAurCellDefDirective>;

  /** key → шаблон тела ячейки, собранный из спроецированных ngxAurCellDef. */
  _cellTemplates = new Map<string, TemplateRef<any>>();
  private cellDefsSub?: Subscription;

  // @ts-ignore
  @Input() extraHeaderCellTopTemplate: TemplateRef<any> | null;

  // @ts-ignore
  @Input() extraHeaderCellBottomTemplate: TemplateRef<any> | null;

  // @ts-ignore
  @ViewChildren('rowLink', {read: ElementRef}) rows: QueryList<ElementRef>;
  // @ts-ignore
  @ViewChild('table', {read: ElementRef}) table: ElementRef;

  // @ts-ignore
  @Input() tableConfig: TableConfig<T>;

  @Input() tableData: T[] = [];

  @Input() extendedRowTemplate: TemplateRef<any> | null = null;

  @Input() timelineMarkerTemplate: TemplateRef<any> | null = null;

  // если используется серверный пагинатор, сюда передается текущее состояние пагинатора
  @Input() paginatorState: PaginatorState | undefined;

  // Декларативный загрузчик в серверном режиме. Если задан, таблица сама управляет циклом загрузки.
  // @ts-ignore
  @Input() pageSource?: AurPageSource<T>;

  // Опциональный пагинатор, которым владеет хост и который размещён в другом месте разметки хоста.
  // @ts-ignore
  @Input() externalPaginator?: MatPaginator;

  @Input() isTableBodyHide = false;

  // @ts-ignore
  @ViewChild(MatPaginator, {static: false}) matPaginator: MatPaginator;
  // @ts-ignore
  @ViewChild(MatSort, {static: true}) matSort: MatSort;

  get activePaginator(): MatPaginator {
    return this.externalPaginator ?? this.matPaginator;
  }

  @Output() sort: EventEmitter<Sort> = new EventEmitter();

  @Output() pageChange = new EventEmitter<PageEvent>();

  // события, если действия включены
  @Output() rowAction: EventEmitter<ActionEvent<T>> = new EventEmitter<ActionEvent<T>>();
  // -----------------------

  // события, если включено событие выделения
  @Output() selectChange = new EventEmitter<T[]>();
  @Output() selectAdded = new EventEmitter<T[]>();
  @Output() selectRemoved = new EventEmitter<T[]>();

  @Output() selectedRowsAction = new EventEmitter<ActionEvent<T[]>>();

  @Output() selectionModel = new EventEmitter<SelectionModel<T>>();
  //------------------------

  @Output() rowClick = new EventEmitter<T>();

  @Output() loadingChange = new EventEmitter<boolean>();
  @Output() pageError = new EventEmitter<unknown>();

  /**
   * Успешно загруженная и УЖЕ применённая серверная страница (pageSource-режим).
   * Эмитится на каждую успешную загрузку: старт, смена страницы, сортировка, reload().
   * При ошибке не эмитится (см. pageError). В ручном/legacy режиме события нет —
   * хост загружает данные сам.
   */
  @Output() pageLoaded = new EventEmitter<AurPageLoadedEvent<T>>();

  /**
   * возвращает отфильтрованные строки
   */
  @Output() filterChange = new EventEmitter<T[]>();

  /** @deprecated используйте extraHeaderCellTopTemplate или extraHeaderCellBottomTemplate */
  @Output() columnOffsets = new EventEmitter<ColumnOffset[]>();
  private prevColumnOffsets: ColumnOffset[] = [];

  headerButtonProvider = new HeaderButtonProviderDummy();
  @Output() headerButton = new EventEmitter<MouseEvent>();

  private resizeColumnOffsetsObserver?: ResizeObserver;

  dragDropProvider: DragDropProvider<T> = new DragProviderDummy();

  timelineProvider: TimelineProvider<T> = new TimelineProviderDummy();
  _timelineFirstId = -1;
  _timelineLastId = -1;
  _timelineGaps = new Map<number, { topGap: boolean; bottomGap: boolean; topColor: string | null; bottomColor: string | null }>();

  selectionProvider: SelectionProvider<T> = new SelectionProviderDummy();

  rowActionsProvider: RowActionProvider<T> = new RowActionProviderDummy<T>();

  indexProvider: IndexProvider = new IndexProviderDummy();

  paginationProvider: PaginationProvider = new PaginationProviderDummy();

  private serverPageController?: ServerPageController<T>;
  private externalPaginatorSub?: Subscription;

  totalRowProvider: TotalRowProvider<T> = new TotalRowProviderDummy();

  highlighted: T | undefined;

  // Состояние наведения. Сравнивает идентичность объекта TableRow (тот же экземпляр, по которому итерирует шаблон),
  // в отличие от `highlighted`, который сравнивает row.rowSrc (внешнее @Input-значение, а не TableRow).
  hovered: TableRow<T> | null = null;

  private customSortFunctions = new Map<string, (data: TableRow<T>, key: string) => any>();

  private filterStorage = new Map<string, NgxAurFilters.Base<T>>();
  private _searchText = '';
  private _defaultFilterPredicate: (data: TableRow<T>, filter: string) => boolean;

  //Значение передаётся в контейнере, иначе OnChange не видит изменений, когда передаются одинаковые значения, и подсветка строки не отключается
  // @ts-ignore
  @Input() highlight: HighlightContainer<T> | undefined;

  constructor(private viewContainerRef: ViewContainerRef,
              private cdr: ChangeDetectorRef) {
    // поиск только по значениям колонок (valueConverter) — дефолтный предикат Material
    // конкатенирует ВСЕ поля TableRow, включая служебные id и rowSrc ("[object Object]")
    this._defaultFilterPredicate = (data, filter) => this.searchPredicate(data, filter);
  }

  /** Предикат строки поиска: значения сконфигурированных колонок, без служебных полей. */
  private searchPredicate(data: TableRow<T>, filter: string): boolean {
    const needle = filter.trim().toLowerCase();
    const haystack = this.tableConfig.columnsCfg
      .map(c => data[c.key] ?? '')
      .join('◬')
      .toLowerCase();
    return haystack.includes(needle);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['tableData'] && this.tableData) || (changes['displayColumns'] && this._displayColumns)) {
      this.refreshTable();
    }
    if (changes['highlight'] && this.highlight) {
      this.handleHighlightChange(this.highlight);
    }
    if (changes['externalPaginator']) {
      if (this.externalPaginator) {
        if (this.isServerMode()) {
          // Серверный режим: НЕ привязываем dataSource.paginator (он порезал бы загруженную страницу).
          // (Пере)подключаем только после того, как контроллер создан; первое изменение, пришедшее до
          // ngAfterViewInit, обрабатывается в startServerController().
          if (this.serverPageController) {
            this.subscribeExternalPaginator();
            if (this.paginatorState) {
              this.applyExternalPaginatorState(this.paginatorState);
            }
          }
        } else if (!changes['externalPaginator'].firstChange) {
          // Клиентский режим: привязываем внешний пагинатор, чтобы MatTableDataSource резал данные через него.
          // Защищаемся от firstChange, чтобы не вызвать initPaginator() до ngAfterViewInit.
          this.initPaginator();
        }
      } else {
        // Внешний пагинатор удалён: отписываемся от его событий страницы, чтобы избежать утечки.
        this.externalPaginatorSub?.unsubscribe();
        this.externalPaginatorSub = undefined;
        // Клиентский режим откатывается к (теперь отрисованному) встроенному пагинатору.
        if (!this.isServerMode() && !changes['externalPaginator'].firstChange) {
          this.initPaginator();
        }
      }
    }
  }

  public resetPaginatorPageIndex() {
    if (this.activePaginator) {
      this.activePaginator.firstPage();
    }
  }

  public refreshTable() {
    const selected = this.selectionProvider?.selection?.selected ?? [];
    this.tableData = this.tableData || [];
    this.prepareTableData(selected);
  }

  private handleHighlightChange(h: HighlightContainer<T>) {
    if (this.highlighted === h.value) {
      this.highlight = undefined;
      this.highlighted = undefined;
    } else {
      this.highlighted = h.value;
      const index = this.tableDataSource.data.findIndex(row => row.rowSrc === h.value);
      if (index >= 0) {
        this.rows?.toArray()[index]?.nativeElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center"
        });
      }
    }
  }

  ngOnInit(): void {
    if (!this.tableConfig) {
      throw new Error("init inputs [tableConfig] is mandatory!")
    }
    if (this.isServerWiring() && !this.paginatorState) {
      this.paginatorState = PaginatorState.empty();
    }
  }

  ngAfterContentInit(): void {
    this.rebuildCellTemplates();
    this.cellDefsSub = this.cellDefs.changes.subscribe(() => {
      this.rebuildCellTemplates();
      this.cdr.markForCheck();            // таблица OnPush
    });
  }

  /** Пересобирает карту key → шаблон из спроецированных ngxAurCellDef. */
  private rebuildCellTemplates(): void {
    this._cellTemplates.clear();
    const keys = new Set(this.tableConfig.columnsCfg.map(c => c.key));
    this.cellDefs.forEach(def => {
      this._cellTemplates.set(def.key, def.templateRef);   // дубль ключа → побеждает последний
      if (isDevMode() && !keys.has(def.key)) {
        console.warn(`[aur-mat-table] ngxAurCellDef="${def.key}" не соответствует ни одной колонке.`);
      }
    });
  }

  /** Контекст кастомного шаблона ячейки (пересобирается в CD — как у extendedRowTemplate). */
  cellCtx(element: TableRow<T>, key: string): AurCellContext<T> {
    const value = element[key];
    return { $implicit: value, value, row: element, rowSrc: element.rowSrc, index: element.id };
  }

  // нам это нужно, чтобы пагинация работала с *ngIf
  ngAfterViewInit(): void {
    // Должно оставаться безусловным — также покрывает случай первого изменения externalPaginator
    // для клиентского режима (ngOnChanges откладывает initPaginator() при firstChange).
    this.initPaginator()
    this.initSortingDataAccessor();
    // SSR: на сервере ResizeObserver не определён — фича columnOffsets работает только в браузере
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeColumnOffsetsObserver = new ResizeObserver(() => this.updateColumnOffsets());
      this.resizeColumnOffsetsObserver.observe(this.table.nativeElement);
    }
    if (this.isServerMode()) {
      this.startServerController();
    }
  }


  private initPaginator(): void {
    // В серверном режиме держим null — MatTableDataSource вызвал бы
    // _updatePaginator(filteredDataLength) и перезаписал бы длину, присланную сервером.
    // ?? null нормализует undefined (пагинатор не отрендерен), чтобы гвард был точным.
    const target = this.isServerMode() ? null : (this.activePaginator ?? null);
    if (this.tableDataSource.paginator !== target) {
      // сеттер пересоздаёт внутреннюю подписку — присваиваем только при реальном изменении
      this.tableDataSource.paginator = target;
    }
  }

  private initSortingDataAccessor(): void {
    // Серверная обвязка: сортирует сервер — не привязываем MatSort к dataSource, иначе
    // _orderData пересортировал бы серверную страницу по значениям valueConverter
    // (зеркало initPaginator(), который по той же причине не привязывает пагинатор).
    // Стрелки и matSortChange живут на директиве MatSort и от привязки не зависят.
    const sort = this.isServerWiring() ? null : (this.matSort ?? null);
    if (this.tableDataSource.sort !== sort) {
      // тот же гвард: сеттер .sort тоже пересоздаёт подписку
      this.tableDataSource.sort = sort;
    }
    // обычное свойство, подписку не трогает — присваиваем без гварда
    this.tableDataSource.sortingDataAccessor = (data, key) => {
      const customSortFunction = this.customSortFunctions.get(key);
      return customSortFunction ? customSortFunction(data, key) : data[key];
    };
  }

  private updateColumnOffsets() {
    const tableEl: HTMLElement | undefined = this.table?.nativeElement;
    if (!tableEl) {
      return;
    }
    const offsets: ColumnOffset[] = Array.from(tableEl.querySelectorAll('th'))
      .slice(0, this._displayColumns.length)
      .map((c) => (c as HTMLElement))
      .map((c, index) => ({
        left: c.offsetLeft,
        width: c.offsetWidth,
        key: this._displayColumns[index]
      }));
    if (OffsetUtil.areNotEqual(this.prevColumnOffsets, offsets)) {
      this.prevColumnOffsets = offsets;
      this.columnOffsets.emit(offsets);
    }
  }

  private prepareTableData(initSelection: T[] = []) {
    // карту кастомных сортировок обновляем ДО initTable(): sorting accessor читает её
    // синхронно во время sort-прохода пайплайна, который запускает присваивание .data=
    this.initCustomSortFunctionsMap();
    this.initTable();
    this.removeWrongKeysFromDisplayColumns();
    if (!this.paginatorState) {
      // Если пагинатор не серверный, то я инициализирую его здесь, иначе при обновлении данных пагинатор ломается и отображаются все элементы
      this.initPaginator();
    }
    this.initSortingDataAccessor();

    this.indexProvider = IndexProvider.create(this.tableConfig)
      .addIndexColumn(this._displayColumns);

    this.rowActionsProvider = RowActionProvider.create(this.tableConfig)
      .addActionColumn(this._displayColumns)
      .setView(this.tableDataSource.data);

    this.selectionProvider = SelectionProvider.create(this.tableConfig, this.tableDataSource, initSelection)
      .addCheckboxColumn(this._displayColumns)
      .bindEventEmitters(this.selectChange, this.selectAdded, this.selectRemoved, this.selectionModel);

    this.paginationProvider = PaginationProvider.create(this.tableConfig);

    // Серверная страница содержит только свои строки (id = позиция в странице) — смещаем индекс
    // на номер страницы. Клиентский режим режет весь датасет локально (id сквозной) → offset 0.
    const pageSize = this.activePaginator?.pageSize ?? this.paginationProvider.size;
    this._indexPageOffset = this.paginatorState ? this.paginatorState.pageIndex * pageSize : 0;

    this.totalRowProvider = TotalRowProvider.create(this.tableConfig, this.tableDataSource)
      .setTotalRow();

    const _totals = this.totalRowProvider.totals;
    const _data = this.tableDataSource.data;
    const _sc = this.tableConfig.totalRowCfg?.styleCfg;
    this._totalStyle = this.toCss(this.resolveTotal(_sc?.style, _totals, _data) ?? null);
    this._totalClass = this.resolveTotal(_sc?.class, _totals, _data) ?? null;

    this.headerButtonProvider = new HeaderButtonProvider(this.tableConfig.headerButtonCfg)

    this.dragDropProvider = DragDropProvider.create(this.viewContainerRef, this.tableConfig)
      .addColumn(this._displayColumns);

    // Timeline ПОСЛЕДНИМ — unshift гарантирует позицию 0 после всех остальных провайдеров
    this.timelineProvider = TimelineProvider.create(this.tableConfig)
      .addTimelineColumn(this._displayColumns);

    this.emitFilteredValues();

    this._displayExtraHeaderTopCell = this._displayColumns.map(col => col + this.EXTRA_HEADER_CELL_TOP_SUFFIX)
    this._displayExtraHeaderBottomCell = this._displayColumns.map(col => col + this.EXTRA_HEADER_CELL_BOTTOM_SUFFIX)
  }

  private removeWrongKeysFromDisplayColumns() {
    const whiteKeys = new Set(this.tableConfig.columnsCfg.map(cfg => cfg.key));
    this._displayColumns = this._displayColumns.filter(actual => whiteKeys.has(actual) || actual.startsWith('tbl_'));
  }

  private initCustomSortFunctionsMap() {
    this.customSortFunctions.clear();
    this.tableConfig.columnsCfg
      .filter(c => c.sort != null && isFeatureEnabledFn(c.sort) && c.sort.customSort)
      .forEach(c => this.customSortFunctions.set(c.key, c.sort!.customSort!))
  }

  private initTable() {
    this._tableName = this.tableConfig.name ?? 'unknown-table-name';
    this.tableDataSource.data = TableRowsFactory.convert(this.tableData, this.tableConfig.columnsCfg);
    this.tableView = TableViewFactory.toView(this.tableDataSource.data, this.tableConfig)
    this.rowStyles = RowStyleFactory.toRowStyles(this.tableDataSource.data, this.tableConfig)
    this._headerStyle = this.toCss(this.tableConfig.headerRowCfg?.styleCfg?.style);
    this._headerClass = this.tableConfig.headerRowCfg?.styleCfg?.class ?? null;
    this._alignClass = this.buildAlignClassMap();
    this._rowsInteractive = !!this.tableConfig.bodyRowCfg?.clickCfg;
    if (!this._customDisplayColumnsEnabled) {
      this._displayColumns = DisplayColumnsFactory.create(this.tableConfig);
    }
  }

  private buildAlignClassMap(): Record<string, 'aur-align-center' | 'aur-align-right' | undefined> {
    const toClass = (a?: ColumnAlign) =>
      a === 'center' ? 'aur-align-center' as const
        : a === 'right' ? 'aur-align-right' as const
          : undefined;
    const map: Record<string, 'aur-align-center' | 'aur-align-right' | undefined> = {};
    const def = this.tableConfig.tableViewCfg?.align;
    this.tableConfig.columnsCfg.forEach(c => map[c.key] = toClass(c.align ?? def));
    map[IndexProvider.COLUMN_NAME] = toClass(this.tableConfig.indexCfg?.align ?? def);
    return map;
  }

  applySearchFilter(event: Event) {
    this._searchText = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.applyAllFilters();
  }

  public removeFilter(filterName: string) {
    if (this.filterStorage.get(filterName)) {
      this.filterStorage.delete(filterName);
      this.applyFiltersInternal();
    }
  }

  public applyFilter(filterName: string, filter: NgxAurFilters.Base<T>): void {
    if (!this.filterStorage.get(filterName) || (!this.filterStorage.get(filterName)!.equals(filter))) {
      this.filterStorage.set(filterName, filter);
      this.applyFiltersInternal();
    }
  }

  public clearFilters() {
    this.filterStorage.clear();
    this.applyFiltersInternal();
  }

  private applyFiltersInternal() {
    this.applyAllFilters();
  }

  private applyAllFilters() {
    const filterActions = [...this.filterStorage.values()];
    const searchText = this._searchText;
    const defaultPredicate = this._defaultFilterPredicate;

    this.tableDataSource.filterPredicate = (data, _filter) => {
      const passesCustom = filterActions.length === 0 || filterActions.every(f => f.filterFn()(data));
      const passesSearch = !searchText || defaultPredicate(data, searchText);
      return passesCustom && passesSearch;
    };
    // Передать уникальное значение чтобы фильтрация запустилась
    this.tableDataSource.filter = 'combined-' + Math.random();
    this.emitFilteredValues();
  }

  private emitFilteredValues(): void {
    this.filterChange.emit(this.tableDataSource.filteredData.map(f => f.rowSrc));
    this.updateTimelineBounds();
  }

  sortTable(sortParameters: Sort) {
    this.sort.emit(sortParameters);
    if (this.isServerMode() && this.serverPageController) {
      this.serverPageController.onSort(sortParameters);
    }
    // MatTableDataSource обрабатывает sort через RxJS-подписку —
    // filteredData обновится в следующем микротаске
    Promise.resolve().then(() => {
      this.updateTimelineBounds();
      this.cdr.markForCheck();
    });
  }

  onPageChangeInternal(event: PageEvent): void {
    this.updateTimelineBounds();
    this.pageChange.emit(event);
    if (this.isServerMode() && this.serverPageController) {
      this.serverPageController.onPage({ pageIndex: event.pageIndex, pageSize: event.pageSize });
    }
    this.cdr.markForCheck();
  }

  private updateTimelineBounds(): void {
    if (!this.timelineProvider.isEnabled) return;

    const visibleData = this.getTimelineVisibleData();
    const segmentColorFn = this.timelineProvider.segmentColor;

    const isDefaultOrder = !this.matSort?.active || this.matSort?.direction === '';
    const hasActiveFilter = this.tableDataSource.filteredData.length
      < this.tableDataSource.data.length;
    const detectGaps = isDefaultOrder && hasActiveFilter;

    this._timelineGaps.clear();

    for (let i = 0; i < visibleData.length; i++) {
      const topColor = segmentColorFn && i > 0
        ? segmentColorFn(visibleData[i - 1], visibleData[i])
        : null;
      const bottomColor = segmentColorFn && i < visibleData.length - 1
        ? segmentColorFn(visibleData[i], visibleData[i + 1])
        : null;

      this._timelineGaps.set(visibleData[i].id, {
        topGap: detectGaps && i > 0
          && visibleData[i].id !== visibleData[i - 1].id + 1,
        bottomGap: detectGaps && i < visibleData.length - 1
          && visibleData[i].id !== visibleData[i + 1].id - 1,
        topColor,
        bottomColor
      });
    }

    this._timelineFirstId = visibleData.length > 0 ? visibleData[0].id : -1;
    this._timelineLastId = visibleData.length > 0 ? visibleData[visibleData.length - 1].id : -1;
  }

  private getTimelineVisibleData(): TableRow<T>[] {
    const data = this.tableDataSource.filteredData;

    // Server-side: данные уже постраничные, не режем повторно
    if (this.paginatorState) return data;

    // Client-side с пагинацией: вырезаем видимый срез
    if (this.paginationProvider.isEnabled && this.activePaginator) {
      const start = this.activePaginator.pageIndex * this.activePaginator.pageSize;
      return data.slice(start, start + this.activePaginator.pageSize);
    }

    // Без пагинации
    return data;
  }

  emitSelectedRowsAction(action: string, rows: T[]) {
    this.selectedRowsAction.emit({action, value: rows});
  }

  emitRowAction(action: string, row: T, $event: MouseEvent) {
    $event.stopPropagation();
    this.rowAction.emit({action, value: row});
  }

  /**
   * Отправляет действие, инициированное элементом mat-menu.
   *
   * В отличие от {@link emitRowAction}, здесь НЕ нужно вызывать $event.stopPropagation():
   * mat-menu закрывается, когда клик всплывает до его панели
   * ((click)="closed.emit('click')"), поэтому остановка всплытия оставила бы
   * меню открытым. Меню рендерится в overlay вне строки, так что здесь нет
   * клика по строке, который нужно подавлять.
   */
  emitMenuAction(action: string, row: T) {
    this.rowAction.emit({action, value: row});
  }

  masterToggle() {
    this.selectionProvider.masterToggle();
  }

  isAllSelected(): boolean {
    return this.selectionProvider.isAllSelected();
  }

  castSrc(row: any): TableRow<T> {
    return row;
  }

  /** trackBy для всех дефов строк (row defs) таблицы: бизнес-ключ из конфига или ссылка на rowSrc. */
  trackByRow = (_: number, row: TableRow<T>): unknown =>
    this.tableConfig.trackBy ? this.tableConfig.trackBy(row.rowSrc) : row.rowSrc;

  /** StyleBuilder.Row | string | null -> CSS-строка | null. */
  private toCss(s?: StyleBuilder.Row | string | null): string | null {
    if (s == null) return null;
    return typeof s === 'string' ? s : s.build();
  }

  /** `base` с `overlay` поверх. Builder-ы -> переопределение полей; любая строка -> конкатенация (в CSS побеждает последнее). */
  private mergeStyle(
    base?: StyleBuilder.Row | string | null,
    overlay?: StyleBuilder.Row | string | null,
  ): string | null {
    if (base == null) return this.toCss(overlay);
    if (overlay == null) return this.toCss(base);
    if (base instanceof StyleBuilder.Row && overlay instanceof StyleBuilder.Row) {
      return base.overrideWith(overlay).build();
    }
    return `${this.toCss(base) ?? ''} ${this.toCss(overlay) ?? ''}`.trim();
  }

  /** хук итога: статическое значение или (totals, data) => значение. */
  private resolveTotal<R>(
    v: R | ((t: Map<string, any>, d: TableRow<T>[]) => R) | undefined,
    totals: Map<string, any>, data: TableRow<T>[],
  ): R | undefined {
    return typeof v === 'function' ? (v as any)(totals, data) : v;
  }

  /** RowValue<T,R> → R: статика как есть, функция вызывается со строкой. */
  private resolveRow<R>(v: RowValue<T, R> | undefined, row: TableRow<T>): R | undefined {
    return typeof v === 'function' ? (v as (row: TableRow<T>) => R)(row) : v;
  }

  /** Хелпер для шаблона: функция активна, когда её конфигурация присутствует, если только не задано `enable: false`. */
  isFeatureEnabled(cfg: { enable?: boolean } | null | undefined): boolean {
    return isFeatureEnabledFn(cfg);
  }

  /**
   * Видна ли строка итогов на текущей странице.
   * По умолчанию итоги показываются только на последней странице пагинации;
   * `totalRowCfg.showOnEveryPage: true` возвращает показ на каждой странице.
   * Когда пагинация выключена — итоги показываются всегда.
   */
  isTotalRowVisible(): boolean {
    if (this.tableConfig.totalRowCfg?.showOnEveryPage) return true;
    if (!this.paginationProvider.isEnabled) return true;
    const { pageIndex, lastPageIndex } = this.currentPaging();
    return pageIndex >= lastPageIndex;
  }

  /**
   * Текущий индекс страницы и индекс последней страницы.
   * Серверный режим читает их из paginatorState (как getTimelineVisibleData),
   * клиентский — из активного пагинатора и числа отфильтрованных строк.
   */
  private currentPaging(): { pageIndex: number; lastPageIndex: number } {
    let total: number, pageIndex: number, pageSize: number;
    if (this.paginatorState) {
      total = this.paginatorState.length;
      pageIndex = this.paginatorState.pageIndex;
      pageSize = this.activePaginator?.pageSize ?? this.paginationProvider.size;
    } else {
      total = this.tableDataSource.filteredData.length;
      pageIndex = this.activePaginator?.pageIndex ?? 0;
      pageSize = this.activePaginator?.pageSize ?? this.paginationProvider.size;
    }
    const lastPageIndex = pageSize > 0 ? Math.max(0, Math.ceil(total / pageSize) - 1) : 0;
    return { pageIndex, lastPageIndex };
  }

  private hoverActive(row: TableRow<T>): boolean {
    const h = this.tableConfig.bodyRowCfg?.hoverCfg;
    return this.hovered === row && h?.enable !== false;
  }

  onRowEnter(row: TableRow<T>) { this.hovered = row; }
  onRowLeave(row: TableRow<T>) { if (this.hovered === row) this.hovered = null; }

  /** [style] для <tr> тела: base -> overlay наведения -> overlay подсветки (побеждает подсветка). */
  rowStyle(row: TableRow<T>): string | null {
    let acc: StyleBuilder.Row | string | null = this.rowStyles[row.id]?.style ?? null;
    if (this.hoverActive(row)) {
      acc = this.mergeStyle(acc, this.resolveRow(this.tableConfig.bodyRowCfg?.hoverCfg?.styleCfg?.style, row) ?? null);
    }
    if (this.highlighted === row.rowSrc) {
      acc = this.mergeStyle(acc, this.resolveRow(this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg?.style, row) ?? null);
    }
    return this.toCss(acc);
  }

  rowNgClass(row: TableRow<T>): { [klass: string]: boolean } {
    const hover = this.tableConfig.bodyRowCfg?.hoverCfg;
    const click = this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg;
    const isHighlighted = this.highlighted === row.rowSrc;
    // click-style резолвим только для подсвеченной строки (иначе функция зря зовётся на каждую)
    const hl = isHighlighted ? this.resolveRow(click?.style, row) : null;
    const hlHasColor = hl instanceof StyleBuilder.Row ? !!hl.colorValue : !!hl;
    const cls: { [klass: string]: boolean } = {
      'pointer': this.resolveRow(hover?.pointer, row) || false,
      'new-color': isHighlighted && hlHasColor,
    };
    const custom = this.rowStyles[row.id]?.class;
    if (custom) cls[custom] = true;
    const hcls = this.hoverActive(row) ? this.resolveRow(hover?.styleCfg?.class, row) : null;
    if (hcls) cls[hcls] = true;
    const ccls = isHighlighted ? this.resolveRow(click?.class, row) : null;
    if (ccls) cls[ccls] = true;
    return cls;
  }

  handleRowClick(row: TableRow<T>) {
    if (row.rowSrc !== this.highlighted || (row.rowSrc === this.highlighted && !this.tableConfig.bodyRowCfg?.clickCfg?.cancelable)) {
      this.rowClick.emit(row.rowSrc);
      this.highlighted = row.rowSrc;
    } else {
      this.rowClick.emit(undefined);
      this.highlighted = undefined;
    }
  }

  /**
   * Клавиатурная активация строки: Enter/Space ведут себя как клик.
   * Обрабатываются только события самой строки — Enter/Space на вложенных
   * интерактивных элементах (чекбокс, кнопки действий) всплывают и не должны
   * дублировать клик по строке. preventDefault у Space подавляет скролл страницы.
   */
  handleRowKeydown(event: KeyboardEvent, row: TableRow<T>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleRowClick(row);
    }
  }

  public getSelectionModel(): SelectionModel<T> {
    return this.selectionProvider.selection;
  }

  private isServerMode(): boolean {
    return !!this.pageSource;
  }

  private isServerWiring(): boolean {
    return !!this.pageSource || this.tableConfig?.paginationCfg?.mode === 'server';
  }

  private startServerController(): void {
    if (!this.pageSource) {
      return;
    }
    this.serverPageController = new ServerPageController<T>(this.pageSource, {
      onResult: result => {
        this.paginatorState = result.state;
        this.applyExternalPaginatorState(result.state);
        this.tableData = result.content;
        this.refreshTable();
        // эмит ПОСЛЕ refreshTable(): подписчик читает уже применённое публичное состояние таблицы
        this.pageLoaded.emit({
          content: result.content,
          totalElements: result.state.length,
          pageIndex: result.state.pageIndex,
        });
        this.cdr.markForCheck();
      },
      onLoading: loading => {
        this.loadingChange.emit(loading);
        this.cdr.markForCheck();
      },
      onError: error => this.pageError.emit(error),
    });

    this.subscribeExternalPaginator();

    const initialSort: Sort | undefined =
      this.matSort?.active ? { active: this.matSort.active, direction: this.matSort.direction } : undefined;

    this.serverPageController.start({
      // провайдер может быть ещё не инициализирован (в серверном режиме нет привязки tableData) — читаем из конфигурации
      pageSize: this.tableConfig.paginationCfg?.size ?? 20,
      sort: initialSort,
    });
  }

  private subscribeExternalPaginator(): void {
    this.externalPaginatorSub?.unsubscribe();
    if (this.externalPaginator) {
      this.externalPaginatorSub = this.externalPaginator.page.subscribe(event =>
        this.onPageChangeInternal(event)
      );
    }
  }

  private applyExternalPaginatorState(state: PaginatorState): void {
    if (this.externalPaginator) {
      // РИСК (подход C из спецификации): OnPush MatPaginator требует CD, чтобы отразить императивные изменения.
      this.externalPaginator.length = state.length;
      this.externalPaginator.pageIndex = state.pageIndex;
      this.cdr.markForCheck();
    }
  }

  /** Повторно вызывает pageSource (серверный режим). resetPageIndex по умолчанию true (например, изменился внешний фильтр). */
  public reload(opts?: { resetPageIndex?: boolean }): void {
    if (this.isServerMode() && this.serverPageController) {
      this.serverPageController.reload(opts);
    } else {
      // Клиентский режим: повторно применяем текущие данные/фильтры.
      this.refreshTable();
    }
  }

  ngOnDestroy() {
    this.resizeColumnOffsetsObserver?.disconnect();
    this.serverPageController?.stop();
    this.externalPaginatorSub?.unsubscribe();
    this.cellDefsSub?.unsubscribe();
  }

  onDragStart($event: DragEvent, row: TableRow<T>) {
    if (this.selectionProvider.isEnabled && this.dragDropProvider.multiple && this.selectionProvider.selection.selected.length > 1) {
      let selectedRows = this.selectionProvider.getSelectedRows();
      if (selectedRows.find(r => r.id === row.id)) {
        this.dragDropProvider.manager.startDrag(this._tableName, selectedRows, $event);
        return;
      }
    }
    this.dragDropProvider.manager.startDrag(this._tableName, [row], $event);
  }

  onDragOver($event: DragEvent) {
    this.dragDropProvider.manager.canDropPreventDefault(this._tableName, $event);
  }

  onDrop($event: DragEvent, row: TableRow<T>) {
    this.dragDropProvider.manager.drop(this._tableName, row);
  }

  onDragEnd($event: DragEvent, row: TableRow<T>) {
    this.dragDropProvider.manager.endDrag();
  }
}
