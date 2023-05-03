import {SelectionModel} from '@angular/cdk/collections';
import {MatTableDataSource} from '@angular/material/table';
import {EventEmitter} from '@angular/core';
import {TableRow} from "../model/TableRow";

export interface SelectableContext {
  position?: 'start' | 'end';
  multiple?: boolean;
}

export class SelectionProvider<T> {

  public readonly COLUMN_NAME = 'tbl_selects';
  selection: SelectionModel<TableRow<T>>;
  context: SelectableContext;
  tableDataSource: MatTableDataSource<TableRow<T>>;

  constructor(ctx: SelectableContext, columns: string[], tableDataSource: MatTableDataSource<TableRow<T>>) {
    this.context = ctx;
    this.selection = new SelectionModel<TableRow<T>>(ctx.multiple, []);
    this.tableDataSource = tableDataSource;
    this.initCheckboxColumn(columns);
  }

  initCheckboxColumn(columns: string[]) {
    if (this.context.position === 'start') {
      columns.unshift(this.COLUMN_NAME);
    } else {
      columns.push(this.COLUMN_NAME);
    }
  }

  bind(selected: EventEmitter<TableRow<T>[]>, onSelect: EventEmitter<TableRow<T>[]>, onDeselect: EventEmitter<TableRow<T>[]>) {
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
      this.tableDataSource.data.forEach(row => this.selection.select(row));
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.tableDataSource.data.length;
    return numSelected === numRows;
  }
}
