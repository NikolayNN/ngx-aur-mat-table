import {AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {ColumnView, ColumnConfig, TableConfig} from './model/ColumnConfig';
import {MatSort, Sort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {SelectionProvider} from './providers/SelectionProvider';
import {ActionEvent, RowActionProvider} from './providers/RowActionProvider';
import {TableRow} from "./model/TableRow";
import {TableViewConverter} from "./providers/TableViewConverter";
import {IndexProvider} from "./providers/IndexProvider";
import {TableDataProvider} from "./providers/TableDataProvider";
import {PaginationProvider} from "./providers/PaginationProvider";
import {FilterProvider} from "./providers/FilterProvider";


@Component({
  selector: 'aur-mat-table',
  templateUrl: './ngx-aur-mat-table.component.html',
  styleUrls: ['./ngx-aur-mat-table.component.scss'],
})
export class NgxAurMatTableComponent<T> implements OnInit, AfterViewInit {

  public tableDataSource = new MatTableDataSource<TableRow<T>>([]);
  public displayedColumns: string[] = [];

  private tableView: Map<string, ColumnView<string>>[] = [];

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
  //------------------------


  @Output() onRowClick = new EventEmitter<T>();

  // @ts-ignore
  selectionProvider: SelectionProvider<T>;
  // @ts-ignore
  rowActionsProvider: RowActionProvider<T>;

  // @ts-ignore
  indexProvider: IndexProvider;

  // @ts-ignore
  paginationProvider: PaginationProvider;

  tableDataProvider = new TableDataProvider<T>();

  // @ts-ignore
  filterProvider: FilterProvider;

  constructor() {
  }

  ngOnInit(): void {
    if (!this.tableConfig || !this.tableData) {
      throw new Error("init inputs [tableConfig] and [tableData] is mandatory!")
    }
    this.setTableDataSource();
    this.tableView = TableViewConverter.toView(this.tableDataSource.data, this.tableConfig)
    this.displayedColumns = this.tableConfig.columnsCfg.map((tableColumn: ColumnConfig<any>) => tableColumn.name);

    if (this.tableConfig.indexCfg && this.tableConfig.indexCfg.enable) {
      this.indexProvider = new IndexProvider(this.tableConfig.indexCfg, this.displayedColumns);
    }
    if (this.tableConfig.actionCfg) {
      this.rowActionsProvider = new RowActionProvider<TableRow<T>>(this.tableConfig.actionCfg, this.displayedColumns);
    }
    if (this.tableConfig.selectionCfg) {
      this.selectionProvider = new SelectionProvider<T>(this.tableConfig.selectionCfg, this.displayedColumns, this.tableDataSource);
      this.selectionProvider.bind(this.selected, this.onSelect, this.onDeselect);
    }
    if (this.tableConfig.pageableCfg) {
      this.paginationProvider = new PaginationProvider(this.tableConfig.pageableCfg);
    }
    if (this.tableConfig.filterCfg) {
      this.filterProvider = new FilterProvider();
    }
  }

  // we need this, in order to make pagination work with *ngIf
  ngAfterViewInit(): void {
    this.tableDataSource.paginator = this.matPaginator;
  }


  setTableDataSource() {
    let convert = this.tableDataProvider.convert(this.tableData, this.tableConfig.columnsCfg);
    this.tableDataSource = new MatTableDataSource<TableRow<T>>(convert);
    this.tableDataSource.paginator = this.matPaginator;
    this.tableDataSource.sort = this.matSort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.tableDataSource.filter = filterValue.trim().toLowerCase();
  }

  sortTable(sortParameters: Sort) {
    this.sort.emit(sortParameters);
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

  getView(rowIndex: number, columnKey: string): ColumnView<string> | undefined {
    return this.tableView[rowIndex].get(columnKey);
  }
}
