import {SelectionModel} from '@angular/cdk/collections';
import {MatTableDataSource} from '@angular/material/table';
import {EventEmitter} from '@angular/core';
import {TableRow} from "../model/TableRow";
import {SelectionConfig, TableConfig} from "../model/ColumnConfig";
import {EmptyValue} from "../model/EmptyValue";
import {AbstractProvider} from "./AbstractProvider";

export class SelectionProvider<T> extends AbstractProvider {
  public readonly isEnabled = true;
  public static readonly COLUMN_NAME = 'tbl_selects';
  selection: SelectionModel<T>;
  config: SelectionConfig<T>;
  tableDataSource: MatTableDataSource<TableRow<T>>;

  constructor(tableConfig: TableConfig<T>, tableDataSource: MatTableDataSource<TableRow<T>>, initSelection: T[]) {
    super();
    this.config = tableConfig?.selectionCfg || EmptyValue.SELECTION_CONFIG;
    this.selection = new SelectionModel<T>(this.config.multiple, initSelection);
    if (this.config.compareWith) {
      this.selection.compareWith = this.config.compareWith;
    }
    this.tableDataSource = tableDataSource;
  }

  get COLUMN_NAME() {
    return SelectionProvider.COLUMN_NAME;
  }

  public addCheckboxColumn(columns: string[]): SelectionProvider<T> {
    if (this.hasKey(this.COLUMN_NAME, columns)) {
      return this;
    }
    if (this.config.position === 'start') {
      columns.unshift(this.COLUMN_NAME);
    } else {
      columns.push(this.COLUMN_NAME);
    }
    return this;
  }

  public bindEventEmitters(selected: EventEmitter<T[]>, onSelect: EventEmitter<T[]>, onDeselect: EventEmitter<T[]>, selectionModel: EventEmitter<SelectionModel<T>>): SelectionProvider<T> {
    this.selection.changed.subscribe(event => {
      if (event.added) {
        onSelect.emit(event.added);
      }
      if (event.removed) {
        onDeselect.emit(event.removed);
      }
      selected.emit(this.selection.selected);
    });
    selectionModel.emit(this.selection);
    return this;
  }

  public masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.deselect(...this.tableDataSource.filteredData.map(d => d.rowSrc))
    } else {
      this.selection.select(...this.tableDataSource.filteredData.map(d => d.rowSrc))
    }
  }

  isAllSelected(): boolean {
    return this.tableDataSource.filteredData.every(r => this.selection.isSelected(r.rowSrc));
  }

  getSelectedRows(): TableRow<T>[] {
    return this.tableDataSource.filteredData.filter(row =>
      this.selection.isSelected(row.rowSrc)
    );
  }

  private static canEnable<T>(tableConfig: TableConfig<T>): boolean {
    return (tableConfig.selectionCfg && tableConfig.selectionCfg.enable) || false;
  }

  public static create<T>(tableConfig: TableConfig<T>, tableDataSource: MatTableDataSource<TableRow<T>>, initSelection: T[]): SelectionProvider<T> {
    if (SelectionProvider.canEnable(tableConfig)) {
      return new SelectionProvider(tableConfig, tableDataSource, initSelection);
    }
    return new SelectionProviderDummy();
  }
}

export class SelectionProviderDummy<T> extends SelectionProvider<T> {
  public override readonly isEnabled = true;

  constructor() {
    super(EmptyValue.TABLE_CONFIG, EmptyValue.MAT_TABLE_DATA_SOURCE, []);
  }

  public override addCheckboxColumn(columns: string[]): SelectionProvider<T> {
    return this;
  }

  public override bindEventEmitters(selected: EventEmitter<T[]>, onSelect: EventEmitter<T[]>, onDeselect: EventEmitter<T[]>): SelectionProvider<T> {
    return this;
  }
}
