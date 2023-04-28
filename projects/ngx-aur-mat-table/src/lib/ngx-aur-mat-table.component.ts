import {AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {TableColumn} from './TableColumn';
import {MatSort, Sort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {SelectableContext, SelectionProvider} from './SelectionProvider';
import {ActionEvent, RowActionContext, RowActionProvider} from './RowActionProvider';

@Component({
  selector: 'aur-mat-table',
  templateUrl: './ngx-aur-mat-table.component.html',
  styleUrls: ['./ngx-aur-mat-table.component.scss']
})
export class NgxAurMatTableComponent<T> implements OnInit, AfterViewInit {

  public tableDataSource = new MatTableDataSource<T>([]);
  public displayedColumns: string[] = [];
  // @ts-ignore
  @ViewChild(MatPaginator, {static: false}) matPaginator: MatPaginator;
  // @ts-ignore
  @ViewChild(MatSort, {static: true}) matSort: MatSort;

  @Input() isPageable = false;
  @Input() isSortable = false;
  @Input() isFilterable = false;
  @Input() tableColumns: TableColumn<T>[] = [];
  @Input() paginationSizes: number[] = [5, 10, 15];
  @Input() defaultPageSize = this.paginationSizes[1];

  @Output() sort: EventEmitter<Sort> = new EventEmitter();

  // @ts-ignore
  @Input() rowActionable: RowActionContext;
  @Output() onRowAction: EventEmitter<ActionEvent<T>> = new EventEmitter<ActionEvent<T>>();

  // @ts-ignore
  @Input() selectable: SelectableContext;
  @Output() selected = new EventEmitter<T[]>();
  @Output() onSelect = new EventEmitter<T[]>();
  @Output() onDeselect = new EventEmitter<T[]>();

  @Output() onRowClick = new EventEmitter<T>();

  // this property needs to have a setter, to dynamically get changes from parent component
  @Input() set tableData(data: T[]) {
    this.setTableDataSource(data);
  }

  // @ts-ignore
  selectionProvider: SelectionProvider<T>;
  // @ts-ignore
  rowActionsProvider: RowActionProvider<T>;

  constructor() {
  }

  ngOnInit(): void {
    this.displayedColumns = this.tableColumns.map((tableColumn: TableColumn<any>) => tableColumn.name);
    if (this.rowActionable) {
      this.rowActionsProvider = new RowActionProvider<T>(this.rowActionable, this.displayedColumns);
    } else if (this.selectable) {
      this.selectionProvider = new SelectionProvider<T>(this.selectable, this.displayedColumns, this.tableDataSource);
      this.selectionProvider.bind(this.selected, this.onSelect, this.onDeselect);
    }
  }

  // we need this, in order to make pagination work with *ngIf
  ngAfterViewInit(): void {
    this.tableDataSource.paginator = this.matPaginator;
  }


  setTableDataSource(data: any) {
    this.tableDataSource = new MatTableDataSource<any>(data);
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
    sortParameters.active = this.tableColumns.find(column => column.name === sortParameters.active).dataKey;
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
}
