import {SelectionModel} from '@angular/cdk/collections';
import {MatTableDataSource} from '@angular/material/table';
import {EventEmitter} from '@angular/core';
import {TableRow} from "../model/TableRow";
import {SelectionConfig} from "../model/ColumnConfig";

export class SelectionProvider<T> {

  public readonly COLUMN_NAME = 'tbl_selects';
  selection: SelectionModel<T>;
  config: SelectionConfig;
  tableDataSource: MatTableDataSource<TableRow<T>>;

  constructor(ctx: SelectionConfig, columns: string[], tableDataSource: MatTableDataSource<TableRow<T>>) {
    this.config = ctx;
    this.selection = new SelectionModel<T>(ctx.multiple, []);
    this.tableDataSource = tableDataSource;
    this.initCheckboxColumn(columns);
  }

  initCheckboxColumn(columns: string[]) {
    if (this.config.position === 'start') {
      columns.unshift(this.COLUMN_NAME);
    } else {
      columns.push(this.COLUMN_NAME);
    }
  }

  bind(selected: EventEmitter<T[]>, onSelect: EventEmitter<T[]>, onDeselect: EventEmitter<T[]>) {
    this.selection.changed
      .subscribe(event => {
        if (event.added) {
          onSelect.emit(event.added);
        }
        if (event.removed) {
          onDeselect.emit(event.removed);
        }
        selected.emit(this.selection.selected);
      });
  }

  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.tableDataSource.data.forEach(row => this.selection.select(row.rowSrc));
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.tableDataSource.data.length;
    return numSelected === numRows;
  }
}
