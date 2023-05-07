import {AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {ColumnConfig, TableConfig} from './model/TableConfig';
import {MatSort, Sort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {SelectionConfig, SelectionProvider} from './providers/SelectionProvider';
import {ActionEvent, RowActionConfig, RowActionProvider} from './providers/RowActionProvider';
import {TableRow} from "./model/TableRow";
import {TableViewConverter} from "./providers/TableViewConverter";
import {IndexProvider, IndexConfig} from "./providers/IndexProvider";
import {TableDataProvider} from "./providers/TableDataProvider";


@Component({
  selector: 'aur-mat-table',
  templateUrl: './ngx-aur-mat-table.component.html',
  styleUrls: ['./ngx-aur-mat-table.component.scss'],
})
export class NgxAurMatTableComponent<T> implements OnInit, AfterViewInit {

  public tableDataSource = new MatTableDataSource<TableRow<T>>([]);
  public displayedColumns: string[] = [];

  public tableView: Map<string, ColumnConfig<string>>[] = [];

  // @ts-ignore
  @ViewChild(MatPaginator, {static: false}) matPaginator: MatPaginator;
  // @ts-ignore
  @ViewChild(MatSort, {static: true}) matSort: MatSort;
  @Input() isFilterable = false;

  // @ts-ignore
  @Input() indexable: IndexConfig;


  @Input() isPageable = false;
  @Input() paginationSizes: number[] = [5, 10, 15, 25, 50];
  @Input() defaultPageSize = this.paginationSizes[1];

  @Output() sort: EventEmitter<Sort> = new EventEmitter();

  // @ts-ignore
  @Input() rowActionable: RowActionConfig;
  @Output() onRowAction: EventEmitter<ActionEvent<T>> = new EventEmitter<ActionEvent<T>>();

  // @ts-ignore
  @Input() selectable: SelectionConfig;
  @Output() selected = new EventEmitter<T[]>();
  @Output() onSelect = new EventEmitter<T[]>();
  @Output() onDeselect = new EventEmitter<T[]>();

  @Output() onRowClick = new EventEmitter<T>();

  @Input() tableConfig: TableConfig<any>[] = [];

  @Input() tableData: T[] = [];

  // @ts-ignore
  selectionProvider: SelectionProvider<T>;
  // @ts-ignore
  rowActionsProvider: RowActionProvider<T>;

  // @ts-ignore
  indexProvider: IndexProvider;

  tableDataProvider = new TableDataProvider<T>();

  constructor() {
  }

  ngOnInit(): void {
    this.setTableDataSource();
    this.tableView = TableViewConverter.toView(this.tableDataSource.data, this.tableConfig)
    this.displayedColumns = this.tableConfig.map((tableColumn: TableConfig<any>) => tableColumn.name);
    if (this.indexable) {
      this.indexProvider = new IndexProvider(this.indexable, this.displayedColumns);
    } else if (this.rowActionable) {
      this.rowActionsProvider = new RowActionProvider<TableRow<T>>(this.rowActionable, this.displayedColumns);
    } else if (this.selectable) {
      this.selectionProvider = new SelectionProvider<T>(this.selectable, this.displayedColumns, this.tableDataSource);
      this.selectionProvider.bind(this.selected, this.onSelect, this.onDeselect);
    }
  }

  // we need this, in order to make pagination work with *ngIf
  ngAfterViewInit(): void {
    this.tableDataSource.paginator = this.matPaginator;
  }


  setTableDataSource() {
    let convert = this.tableDataProvider.convert(this.tableData, this.tableConfig);
    this.tableDataSource = new MatTableDataSource<TableRow<T>>(convert);
    this.tableDataSource.paginator = this.matPaginator;
    this.tableDataSource.sort = this.matSort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.tableDataSource.filter = filterValue.trim().toLowerCase();
  }

  sortTable(sortParameters: Sort) {
    // defining name of data property, to sort by, instead of column name
    // @ts-ignore
    sortParameters.active = this.tableConfig.find(column => column.name === sortParameters.active).dataKey;
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

  getView(rowIndex: number, columnKey: string): ColumnConfig<string> | undefined {
    return this.tableView[rowIndex].get(columnKey);
  }
}
