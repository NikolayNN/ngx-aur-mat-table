import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
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
  ViewChildren
} from '@angular/core';
import {ColumnView, TableConfig} from './model/ColumnConfig';
import {MatSort, Sort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {SelectionProvider, SelectionProviderDummy} from './providers/SelectionProvider';
import {ActionEvent, RowActionProvider, RowActionProviderDummy} from './providers/RowActionProvider';
import {TableRow} from "./model/TableRow";
import {TableViewFactory} from "./model/TableViewFactory";
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
import {DragProvider, DragProviderDummy} from "./providers/DragProvider";
import {AurDragDropComponent} from "./drag-drop/aur-drag-drop-component";


export class PaginatorState {

  constructor(private _length: number, private _pageIndex: number) {
  }

  get length(): number {
    return this._length;
  }

  get pageIndex(): number {
    return this._pageIndex;
  }

  public static empty(): PaginatorState {
    return new PaginatorState(0, 0);
  }
}

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
      state(ExpandState.COLLAPSED, style({height: '0px', minHeight: '0'})),
      state(ExpandState.EXPANDED, style({height: '*'})),
      transition(`${ExpandState.EXPANDED} <=> ${ExpandState.COLLAPSED}`, animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class NgxAurMatTableComponent<T> implements OnInit, OnChanges, AfterViewInit, AfterViewChecked, OnDestroy, NgxAurMatTablePublic<T>, AurDragDropComponent<TableRow<T>> {

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

  // если используется серверный пагинатор, сюда передается текущее состояние пагинатора
  @Input() paginatorState: PaginatorState | undefined;

  @Input() isTableBodyHide = false;

  // @ts-ignore
  @ViewChild(MatPaginator, {static: false}) matPaginator: MatPaginator;
  // @ts-ignore
  @ViewChild(MatSort, {static: true}) matSort: MatSort;

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

  dragProvider: DragProvider = new DragProviderDummy();

  selectionProvider: SelectionProvider<T> = new SelectionProviderDummy();

  rowActionsProvider: RowActionProvider<T> = new RowActionProviderDummy<T>();

  indexProvider: IndexProvider = new IndexProviderDummy();

  paginationProvider: PaginationProvider = new PaginationProviderDummy();

  totalRowProvider: TotalRowProvider<T> = new TotalRowProviderDummy();

  highlighted: T | undefined;

  private customSortFunctions = new Map<string, (data: TableRow<T>, key: string) => any>();

  private filterStorage = new Map<string, NgxAurFilters.Base<T>>();

  //значение передается в контейнере иначе OnChange не видит изменений когда передаются одинаковые значение и подсветка строки не отключается
  // @ts-ignore
  @Input() highlight: HighlightContainer<T> | undefined;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['tableData'] && this.tableData) || (changes['displayColumns'] && this._displayColumns)) {
      this.refreshTable();
    }
    if (changes['highlight'] && this.highlight) {
      this.handleHighlightChange(this.highlight);
    }
  }

  public resetPaginatorPageIndex() {
    if (this.matPaginator) {
      this.matPaginator.firstPage();
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
  }

  // we need this, in order to make pagination work with *ngIf
  ngAfterViewInit(): void {
    this.initPaginator()
    this.initSortingDataAccessor();
    this.resizeColumnOffsetsObserver = new ResizeObserver(() => this.updateColumnOffsets());
    this.resizeColumnOffsetsObserver.observe(this.table.nativeElement);
  }

  ngAfterViewChecked() {
    this.updateColumnOffsets();
  }

  private initPaginator(): void {
    if (this.tableDataSource) {
      this.tableDataSource.paginator = this.matPaginator;
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
    if (!this.paginatorState) {
      // если пагинатор не серверный то его я здесь инициализирую иначе при обновлении данных пагинатор ломается и отображаются все элементы
      this.initPaginator();
    }
    this.initSortingDataAccessor();

    this.dragProvider = DragProvider.create(this.tableConfig)
      .addColumn(this._displayColumns);

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
      .setStyle()
      .setTotalRow();

    this.headerButtonProvider = new HeaderButtonProvider(this.tableConfig.tableHeaderButtonCfg)

    this.emitFilteredValues();

    this._displayExtraHeaderTopCell = this._displayColumns.map(col => col + this.EXTRA_HEADER_CELL_TOP_SUFFIX)
    this._displayExtraHeaderBottomCell = this._displayColumns.map(col => col + this.EXTRA_HEADER_CELL_BOTTOM_SUFFIX)
  }

  private initCustomSortFunctionsMap() {
    this.tableConfig.columnsCfg
      .filter(c => c.sort && c.sort.enable && c.sort.customSort)
      .forEach(c => this.customSortFunctions.set(c.key, c.sort!.customSort!))
  }

  private initTable() {
    this._tableName = this.tableConfig.name ?? 'unknown-table-name';
    this.tableDataSource = MatTableDataSourceFactory.convert(this.tableData, this.tableConfig.columnsCfg);
    this.tableView = TableViewFactory.toView(this.tableDataSource.data, this.tableConfig)
    if (!this._customDisplayColumnsEnabled) {
      this._displayColumns = DisplayColumnsFactory.create(this.tableConfig);
    }
  }

  applySearchFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.tableDataSource.filter = filterValue.trim().toLowerCase();
    this.emitFilteredValues();
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
    const filterActions = [...this.filterStorage.values()];
    this.tableDataSource.filterPredicate = (data) => {
      return filterActions.every(filterAction => filterAction.filterFn()(data));
    };
    // Применение фильтрации. нужно передать уникальное значение чтобы фильтрация запустилась
    this.tableDataSource.filter = 'trigger-' + Math.random();
    this.emitFilteredValues();
  }

  private emitFilteredValues(): void {
    this.onFilter.emit(this.tableDataSource.filteredData.map(f => f.rowSrc))
  }

  sortTable(sortParameters: Sort) {
    this.sort.emit(sortParameters);
  }

  emitSelectedRowsAction(action: string, rows: T[]) {
    this.onSelectedRowsAction.emit({action, value: rows});
  }

  emitRowAction(action: string, row: T, $event: MouseEvent) {
    $event.stopPropagation();
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

  rowClick(row: TableRow<T>) {
    if (row.rowSrc !== this.highlighted || (row.rowSrc === this.highlighted && !this.tableConfig.clickCfg?.cancelable)) {
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

  private hoverTimer: any = null;

  ngOnDestroy() {
    clearTimeout(this.hoverTimer);
    this.resizeColumnOffsetsObserver.disconnect();
  }

  onDragStart($event: DragEvent, row: TableRow<T>) {
    this.dragProvider.manager.startDrag(this._tableName, row);
  }

  onDragOver($event: DragEvent) {
    this.dragProvider.manager.canDrop(this._tableName, $event);
  }

  onDrop($event: DragEvent, row: TableRow<T>) {
    this.tableData = this.dragProvider.manager.onDrop(this.tableDataSource.data, this._tableName, row).map(row => row.rowSrc);
    this.refreshTable();
  }

  onDragEnd($event: DragEvent, row: TableRow<T>) {
    this.tableData = this.dragProvider.manager.endDrag(this.tableDataSource.data).map(row => row.rowSrc);
    this.refreshTable();
  }
}
