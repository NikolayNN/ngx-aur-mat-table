import {SelectionModel} from '@angular/cdk/collections';
import {MatTableDataSource} from '@angular/material/table';
import {EventEmitter} from '@angular/core';
import {TableRow} from "../model/TableRow";
import {SelectionConfig, TableConfig} from "../model/ColumnConfig";
import {EmptyValue} from "../model/EmptyValue";

export class SelectionProvider<T> {
  public readonly isEnabled = true;
  public readonly COLUMN_NAME = 'tbl_selects';
  selection: SelectionModel<T>;
  config: SelectionConfig;
  tableDataSource: MatTableDataSource<TableRow<T>>;

  constructor(tableConfig: TableConfig<T>, tableDataSource: MatTableDataSource<TableRow<T>>) {
    this.config = tableConfig?.selectionCfg || EmptyValue.SELECTION_CONFIG;
    this.selection = new SelectionModel<T>(this.config.multiple, []);
    this.tableDataSource = tableDataSource;
  }

  public addCheckboxColumn(columns: string[]): SelectionProvider<T> {
    if (this.config.position === 'start') {
      columns.unshift(this.COLUMN_NAME);
    } else {
      columns.push(this.COLUMN_NAME);
    }
    return this;
  }

  public bindEventEmitters(selected: EventEmitter<T[]>, onSelect: EventEmitter<T[]>, onDeselect: EventEmitter<T[]>): SelectionProvider<T> {
    this.selection.changed.subscribe(event => {
      if (event.added) {
        onSelect.emit(event.added);
      }
      if (event.removed) {
        onDeselect.emit(event.removed);
      }
      selected.emit(this.selection.selected);
    });
    return this;
  }

  public masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.tableDataSource.filteredData.forEach(row => this.selection.select(row.rowSrc));
    }
  }

  isAllSelected(): boolean {
    const filteredData = this.tableDataSource.filteredData;
    const numSelected = this.selection.selected.length;
    const numRows = filteredData.length;
    return numSelected === numRows;
  }

  private static canEnable<T>(tableConfig: TableConfig<T>): boolean {
    return (tableConfig.selectionCfg && tableConfig.selectionCfg.enable) || false;
  }

  public static create<T>(tableConfig: TableConfig<T>, tableDataSource: MatTableDataSource<TableRow<T>>): SelectionProvider<T> {
    if (SelectionProvider.canEnable(tableConfig)) {
      return new SelectionProvider(tableConfig, tableDataSource);
    }
    return new SelectionProviderDummy();
  }
}

export class SelectionProviderDummy<T> extends SelectionProvider<T> {
  public override readonly isEnabled = true;

  constructor() {
    super(EmptyValue.TABLE_CONFIG, EmptyValue.MAT_TABLE_DATA_SOURCE);
  }

  public override addCheckboxColumn(columns: string[]): SelectionProvider<T> {
    return this;
  }

  public override bindEventEmitters(selected: EventEmitter<T[]>, onSelect: EventEmitter<T[]>, onDeselect: EventEmitter<T[]>): SelectionProvider<T> {
    return this;
  }
}
