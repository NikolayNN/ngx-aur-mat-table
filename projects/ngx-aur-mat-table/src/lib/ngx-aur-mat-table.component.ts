import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component, ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges, TemplateRef,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {ColumnView, TableConfig} from './model/ColumnConfig';
import {MatSort, Sort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
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
export class NgxAurMatTableComponent<T> implements OnInit, OnChanges, AfterViewInit, AfterViewChecked, OnDestroy, NgxAurMatTablePublic<T> {

  expandedStateEnum = ExpandState;

  public tableDataSource = new MatTableDataSource<TableRow<T>>([]);
  _displayColumns: string[] = [];
  _customDisplayColumnsEnabled = false;

  @Input() set displayColumns(columns: string[]) {
    if (columns) {
      this._displayColumns = [...columns];
      this._customDisplayColumnsEnabled = columns && columns.length > 0;
    }
  }

  tableView: Map<string, ColumnView<string>>[] = [];

  @ContentChild(NgxTableSubFooterRowDirective) subFooterRowTemplate: TemplateRef<any> | null | undefined;

  // @ts-ignore
  @ViewChildren('rowLink', {read: ElementRef}) rows: QueryList<ElementRef>;
  // @ts-ignore
  @ViewChild('table', {read: ElementRef}) table: ElementRef;

  // @ts-ignore
  @Input() tableConfig: TableConfig<T>;

  @Input() tableData: T[] = [];

  @Input() extendedRowTemplate: TemplateRef<any> | null = null;

  // @ts-ignore
  @ViewChild(MatPaginator, {static: false}) matPaginator: MatPaginator;
  // @ts-ignore
  @ViewChild(MatSort, {static: true}) matSort: MatSort;

  @Output() sort: EventEmitter<Sort> = new EventEmitter();

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

  @Output() columnOffsets = new EventEmitter<ColumnOffset[]>();
  private prevColumnOffsets: ColumnOffset[] = [];

  // @ts-ignore
  private resizeColumnOffsetsObserver: ResizeObserver = EmptyValue.RESIZE_OBSERVER;

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
      this.tableData = this.tableData || [];
      this.prepareTableData();
    }
    if (changes['highlight'] && this.highlight) {
      this.handleHighlightChange(this.highlight);
    }
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

  private prepareTableData() {
    this.initTable();
    this.initCustomSortFunctionsMap();
    this.initPaginator();
    this.initSortingDataAccessor();
    this.indexProvider = IndexProvider.create(this.tableConfig)
      .addIndexColumn(this._displayColumns);

    this.rowActionsProvider = RowActionProvider.create(this.tableConfig)
      .addActionColumn(this._displayColumns)
      .setView(this.tableDataSource.data);

    this.selectionProvider = SelectionProvider.create(this.tableConfig, this.tableDataSource)
      .addCheckboxColumn(this._displayColumns)
      .bindEventEmitters(this.selected, this.onSelect, this.onDeselect, this.selectionModel);

    this.paginationProvider = PaginationProvider.create(this.tableConfig);

    this.totalRowProvider = TotalRowProvider.create(this.tableConfig, this.tableDataSource)
      .setStyle()
      .setTotalRow();
  }

  private initCustomSortFunctionsMap() {
    this.tableConfig.columnsCfg
      .filter(c => c.sort && c.sort.enable && c.sort.customSort)
      .forEach(c => this.customSortFunctions.set(c.key, c.sort!.customSort!))
  }

  private initTable() {
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

  ngOnDestroy() {
    // Останавливаем наблюдение при уничтожении компонента
    this.resizeColumnOffsetsObserver.disconnect();
  }
}
