import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
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

export interface HighlightContainer<T> {
  value: any;
}

export interface ColumnOffset {
  left: number,
  width: number
}

@Component({
  selector: 'aur-mat-table',
  templateUrl: './ngx-aur-mat-table.component.html',
  styleUrls: ['./ngx-aur-mat-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NgxAurMatTableComponent<T> implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  public tableDataSource = new MatTableDataSource<TableRow<T>>([]);
  public displayedColumns: string[] = [];

  tableView: Map<string, ColumnView<string>>[] = [];

  // @ts-ignore
  @ViewChildren('rowLink', {read: ElementRef}) rows: QueryList<ElementRef>;
  // @ts-ignore
  @ViewChild('table', {read: ElementRef}) table: ElementRef;

  // @ts-ignore
  @Input() tableConfig: TableConfig<T>;

  @Input() tableData: T[] = [];

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
  //------------------------


  @Output() onRowClick = new EventEmitter<T>();

  /**
   * return filtered rows
   */
  @Output() onFilter = new EventEmitter<T[]>();

  @Output() columnOffsets = new EventEmitter<ColumnOffset[]>();

  // @ts-ignore
  private resizeColumnOffsetsObserver: ResizeObserver = EmptyValue.RESIZE_OBSERVER;

  selectionProvider: SelectionProvider<T> = new SelectionProviderDummy();

  rowActionsProvider: RowActionProvider<T> = new RowActionProviderDummy<T>();

  indexProvider: IndexProvider = new IndexProviderDummy();

  paginationProvider: PaginationProvider = new PaginationProviderDummy();

  totalRowProvider: TotalRowProvider<T> = new TotalRowProviderDummy();

  highlighted: T | undefined;

  //значение передается в контейнере иначе OnChange не видит изменений когда передаются одинаковые значение и подсветка строки не отключается
  // @ts-ignore
  @Input() highlight: HighlightContainer<T> | undefined;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tableData'] && this.tableData) {
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
    this.tableDataSource.paginator = this.matPaginator;
    this.tableDataSource.sort = this.matSort;
    this.updateColumnOffsets();
    this.resizeColumnOffsetsObserver = new ResizeObserver(() => this.updateColumnOffsets());
    this.resizeColumnOffsetsObserver.observe(this.table.nativeElement);
  }

  private updateColumnOffsets() {
    const offsets: ColumnOffset[] = Array.from(this.table.nativeElement.querySelectorAll('th'))
      .map(c => (c as HTMLElement))
      .map(c => ({left: c.offsetLeft, width: c.offsetWidth}))
    this.columnOffsets.emit(offsets);
  }

  private prepareTableData() {
    this.initTable();

    this.indexProvider = IndexProvider.create(this.tableConfig)
      .addIndexColumn(this.displayedColumns);

    this.rowActionsProvider = RowActionProvider.create(this.tableConfig)
      .addActionColumn(this.displayedColumns)
      .setView(this.tableDataSource.data);

    this.selectionProvider = SelectionProvider.create(this.tableConfig, this.tableDataSource)
      .addCheckboxColumn(this.displayedColumns)
      .bindEventEmitters(this.selected, this.onSelect, this.onDeselect);

    this.paginationProvider = PaginationProvider.create(this.tableConfig);

    this.totalRowProvider = TotalRowProvider.create(this.tableConfig, this.tableDataSource)
      .setStyle()
      .setTotalRow();
  }

  private initTable() {
    this.tableDataSource = MatTableDataSourceFactory.convert(this.tableData, this.tableConfig.columnsCfg);
    this.tableView = TableViewFactory.toView(this.tableDataSource.data, this.tableConfig)
    this.displayedColumns = DisplayColumnsFactory.create(this.tableConfig);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.tableDataSource.filter = filterValue.trim().toLowerCase();
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

  ngOnDestroy() {
    // Останавливаем наблюдение при уничтожении компонента
    this.resizeColumnOffsetsObserver.disconnect();
  }
}
