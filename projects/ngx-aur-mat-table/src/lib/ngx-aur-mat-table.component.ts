import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
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
import {ColumnView, TableConfig} from './model/ColumnConfig';
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
import {MatTableDataSourceFactory} from "./factories/MatTableDataSourceFactory";
import {DisplayColumnsFactory} from "./factories/DisplayColumnsFactory";
import {EmptyValue} from "./model/EmptyValue";
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
import {AurPageSource} from './model/AurPage';
import {ServerPageController} from './providers/ServerPageController';
import {Subscription} from 'rxjs';

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
export class NgxAurMatTableComponent<T> implements OnInit, OnChanges, AfterViewInit, OnDestroy, NgxAurMatTablePublic<T>, AurDragDropComponent<TableRow<T>> {

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

  @ContentChild(NgxTableSubFooterRowDirective) subFooterRowTemplate: TemplateRef<any> | null | undefined;

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

  // Server-mode declarative loader. When set, the table owns the fetch loop.
  // @ts-ignore
  @Input() pageSource?: AurPageSource<T>;

  // Optional host-owned paginator placed elsewhere in the host layout.
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

  // events if enabled actions
  @Output() onRowAction: EventEmitter<ActionEvent<T>> = new EventEmitter<ActionEvent<T>>();
  // -----------------------

  // events if enabled select event
  @Output() selected = new EventEmitter<T[]>();
  @Output() onSelect = new EventEmitter<T[]>();
  @Output() onDeselect = new EventEmitter<T[]>();

  @Output() onSelectedRowsAction = new EventEmitter<ActionEvent<T[]>>();

  @Output() selectionModel = new EventEmitter<SelectionModel<T>>();
  //------------------------

  @Output() onRowClick = new EventEmitter<T>();

  @Output() loadingChange = new EventEmitter<boolean>();
  @Output() pageError = new EventEmitter<unknown>();

  /**
   * return filtered rows
   */
  @Output() onFilter = new EventEmitter<T[]>();

  /** @deprecated use extraHeaderCellTopTemplate or extraHeaderCellBottomTemplate */
  @Output() columnOffsets = new EventEmitter<ColumnOffset[]>();
  private prevColumnOffsets: ColumnOffset[] = [];

  headerButtonProvider = new HeaderButtonProviderDummy();
  @Output() onHeaderButton = new EventEmitter<MouseEvent>();

  // @ts-ignore
  private resizeColumnOffsetsObserver: ResizeObserver = EmptyValue.RESIZE_OBSERVER;

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

  // Hover state. Compares TableRow object identity (the same instance the template iterates),
  // unlike `highlighted`, which compares row.rowSrc (an external @Input value, not a TableRow).
  hovered: TableRow<T> | null = null;

  private customSortFunctions = new Map<string, (data: TableRow<T>, key: string) => any>();

  private filterStorage = new Map<string, NgxAurFilters.Base<T>>();
  private _searchText = '';
  private _defaultFilterPredicate!: (data: TableRow<T>, filter: string) => boolean;

  //значение передается в контейнере иначе OnChange не видит изменений когда передаются одинаковые значение и подсветка строки не отключается
  // @ts-ignore
  @Input() highlight: HighlightContainer<T> | undefined;

  constructor(private viewContainerRef: ViewContainerRef,
              private cdr: ChangeDetectorRef) {
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
          // Server mode: do NOT bind dataSource.paginator (would slice the loaded page).
          // Only (re)wire once the controller exists; a first-change arriving before
          // ngAfterViewInit is handled by startServerController().
          if (this.serverPageController) {
            this.subscribeExternalPaginator();
            if (this.paginatorState) {
              this.applyExternalPaginatorState(this.paginatorState);
            }
          }
        } else if (!changes['externalPaginator'].firstChange) {
          // Client mode: bind the external paginator so MatTableDataSource slices through it.
          // Guard firstChange so we don't call initPaginator() before ngAfterViewInit.
          this.initPaginator();
        }
      } else {
        // External paginator removed: tear down its page subscription to avoid a leak.
        this.externalPaginatorSub?.unsubscribe();
        this.externalPaginatorSub = undefined;
        // Client mode falls back to the (now-rendered) built-in paginator.
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

  // we need this, in order to make pagination work with *ngIf
  ngAfterViewInit(): void {
    // Must remain unconditional — also covers the externalPaginator first-change case
    // for client mode (ngOnChanges defers initPaginator() on firstChange).
    this.initPaginator()
    this.initSortingDataAccessor();
    this.resizeColumnOffsetsObserver = new ResizeObserver(() => this.updateColumnOffsets());
    this.resizeColumnOffsetsObserver.observe(this.table.nativeElement);
    if (this.isServerMode()) {
      this.startServerController();
    }
  }


  private initPaginator(): void {
    if (this.tableDataSource) {
      // In server mode, do NOT bind the paginator to the data source — MatTableDataSource
      // would call _updatePaginator(filteredDataLength) and overwrite the server-supplied length.
      // Pagination is driven by ServerPageController instead.
      if (this.isServerMode()) {
        this.tableDataSource.paginator = null;
      } else {
        this.tableDataSource.paginator = this.activePaginator;
      }
    }
  }

  private initSortingDataAccessor(): void {
    if (this.tableDataSource) {
      this.tableDataSource.sort = this.matSort;
      this.tableDataSource.sortingDataAccessor = (data, key) => {
        const customSortFunction = this.customSortFunctions.get(key);
        return customSortFunction ? customSortFunction(data, key) : data[key];
      };
    }
  }

  private updateColumnOffsets() {
    if (this.table?.nativeElement?.querySelectorAll('th')) {
      const offsets: ColumnOffset[] = Array.from(this.table.nativeElement.querySelectorAll('th'))
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
  }

  private prepareTableData(initSelection: T[] = []) {
    this.initTable();
    this.initCustomSortFunctionsMap();
    this.removeWrongKeysFromDisplayColumns();
    if (!this.paginatorState) {
      // если пагинатор не серверный то его я здесь инициализирую иначе при обновлении данных пагинатор ломается и отображаются все элементы
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
      .bindEventEmitters(this.selected, this.onSelect, this.onDeselect, this.selectionModel);

    this.paginationProvider = PaginationProvider.create(this.tableConfig);

    this.totalRowProvider = TotalRowProvider.create(this.tableConfig, this.tableDataSource)
      .setTotalRow();

    const _totals = this.totalRowProvider.totals;
    const _data = this.tableDataSource.data;
    const _sc = this.tableConfig.totalRowCfg?.styleCfg;
    this._totalStyle = this.toCss(this.resolveTotal(_sc?.style, _totals, _data) ?? null);
    this._totalClass = this.resolveTotal(_sc?.class, _totals, _data) ?? null;

    this.headerButtonProvider = new HeaderButtonProvider(this.tableConfig.tableHeaderButtonCfg)

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
    this.tableConfig.columnsCfg
      .filter(c => c.sort && c.sort.enable && c.sort.customSort)
      .forEach(c => this.customSortFunctions.set(c.key, c.sort!.customSort!))
  }

  private initTable() {
    this._tableName = this.tableConfig.name ?? 'unknown-table-name';
    this.tableDataSource = MatTableDataSourceFactory.convert(this.tableData, this.tableConfig.columnsCfg);
    this._defaultFilterPredicate = this.tableDataSource.filterPredicate;
    this.tableView = TableViewFactory.toView(this.tableDataSource.data, this.tableConfig)
    this.rowStyles = RowStyleFactory.toRowStyles(this.tableDataSource.data, this.tableConfig)
    this._headerStyle = this.toCss(this.tableConfig.headerRowCfg?.styleCfg?.style);
    this._headerClass = this.tableConfig.headerRowCfg?.styleCfg?.class ?? null;
    if (!this._customDisplayColumnsEnabled) {
      this._displayColumns = DisplayColumnsFactory.create(this.tableConfig);
    }
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
    this.onFilter.emit(this.tableDataSource.filteredData.map(f => f.rowSrc));
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
    this.onSelectedRowsAction.emit({action, value: rows});
  }

  emitRowAction(action: string, row: T, $event: MouseEvent) {
    $event.stopPropagation();
    this.onRowAction.emit({action, value: row});
  }

  /**
   * Emit an action triggered from a mat-menu item.
   *
   * Unlike {@link emitRowAction} this must NOT call $event.stopPropagation():
   * mat-menu closes when the click bubbles up to its panel
   * ((click)="closed.emit('click')"), so stopping propagation would keep the
   * menu open. The menu renders in an overlay outside the row, so there is no
   * row-click to suppress here.
   */
  emitMenuAction(action: string, row: T) {
    this.onRowAction.emit({action, value: row});
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

  /** StyleBuilder.Row | string | null -> CSS string | null. */
  private toCss(s?: StyleBuilder.Row | string | null): string | null {
    if (s == null) return null;
    return typeof s === 'string' ? s : s.build();
  }

  /** base with `overlay` on top. Builders -> field override; any string -> concat (CSS last-wins). */
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

  /** total hook: static value or (totals, data) => value. */
  private resolveTotal<R>(
    v: R | ((t: Map<string, any>, d: TableRow<T>[]) => R) | undefined,
    totals: Map<string, any>, data: TableRow<T>[],
  ): R | undefined {
    return typeof v === 'function' ? (v as any)(totals, data) : v;
  }

  private hoverActive(row: TableRow<T>): boolean {
    const h = this.tableConfig.bodyRowCfg?.hoverCfg;
    return this.hovered === row && h?.enable !== false;
  }

  onRowEnter(row: TableRow<T>) { this.hovered = row; }
  onRowLeave(row: TableRow<T>) { if (this.hovered === row) this.hovered = null; }

  /** [style] for the body <tr>: base -> hover overlay -> highlight overlay (highlight wins). */
  rowStyle(row: TableRow<T>): string | null {
    let acc: StyleBuilder.Row | string | null = this.rowStyles[row.id]?.style ?? null;
    if (this.hoverActive(row)) {
      acc = this.mergeStyle(acc, this.tableConfig.bodyRowCfg?.hoverCfg?.styleCfg?.style ?? null);
    }
    if (this.highlighted === row.rowSrc) {
      acc = this.mergeStyle(acc, this.tableConfig.bodyRowCfg?.clickCfg?.highlightClicked ?? null);
    }
    return this.toCss(acc);
  }

  rowNgClass(row: TableRow<T>): { [klass: string]: boolean } {
    const hover = this.tableConfig.bodyRowCfg?.hoverCfg;
    const hl = this.tableConfig.bodyRowCfg?.clickCfg?.highlightClicked;
    const hlHasColor = hl instanceof StyleBuilder.Row ? !!hl.colorValue : !!hl;
    const cls: { [klass: string]: boolean } = {
      'pointer': hover?.pointer || false,
      'new-color': this.highlighted === row.rowSrc && hlHasColor,
    };
    const custom = this.rowStyles[row.id]?.class;
    if (custom) cls[custom] = true;
    const hcls = this.hoverActive(row) ? hover?.styleCfg?.class : null;
    if (hcls) cls[hcls] = true;
    return cls;
  }

  rowClick(row: TableRow<T>) {
    if (row.rowSrc !== this.highlighted || (row.rowSrc === this.highlighted && !this.tableConfig.bodyRowCfg?.clickCfg?.cancelable)) {
      this.onRowClick.emit(row.rowSrc);
      this.highlighted = row.rowSrc;
    } else {
      this.onRowClick.emit(undefined);
      this.highlighted = undefined;
    }
  }

  public getSelectionModel(): SelectionModel<T> {
    return this.selectionProvider.selection;
  }

  private isServerMode(): boolean {
    return !!this.pageSource;
  }

  private isServerWiring(): boolean {
    return !!this.pageSource || this.tableConfig?.pageableCfg?.mode === 'server';
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
      // provider may not be initialized yet (no tableData binding in server mode) — read from config
      pageSize: this.tableConfig.pageableCfg?.size ?? 20,
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
      // RISK (spec approach C): OnPush MatPaginator needs CD to reflect imperative changes.
      this.externalPaginator.length = state.length;
      this.externalPaginator.pageIndex = state.pageIndex;
      this.cdr.markForCheck();
    }
  }

  /** Re-invoke pageSource (server mode). resetPageIndex defaults to true (e.g. external filter changed). */
  public reload(opts?: { resetPageIndex?: boolean }): void {
    if (this.isServerMode() && this.serverPageController) {
      this.serverPageController.reload(opts);
    } else {
      // Client mode: re-apply current data/filters.
      this.refreshTable();
    }
  }

  ngOnDestroy() {
    this.resizeColumnOffsetsObserver.disconnect();
    this.serverPageController?.stop();
    this.externalPaginatorSub?.unsubscribe();
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
