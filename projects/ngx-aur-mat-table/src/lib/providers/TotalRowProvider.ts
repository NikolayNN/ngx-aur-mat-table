import {TableConfig} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";
import {MatLegacyTableDataSource as MatTableDataSource} from "@angular/material/legacy-table";
import {EmptyValue} from "../model/EmptyValue";
import {AbstractProvider} from "./AbstractProvider";

export class TotalRowProvider<T> extends AbstractProvider {
  isEnabled = true;
  totals = new Map<string, any>();
  style: string | undefined;

  constructor(private tableConfig: TableConfig<T>, private tableDataSource: MatTableDataSource<TableRow<T>>) {
    super();
  }

  setStyle(): TotalRowProvider<T> {
    this.style = this.tableConfig.tableView?.totalRowView?.style;
    return this;
  }

  setTotalRow(): TotalRowProvider<T> {
    this.tableConfig.columnsCfg.forEach(col => {
      if (col.totalConverter) {
        this.totals.set(col.key, col.totalConverter(this.tableDataSource.data))
      }
    })
    return this;
  }

  private static canEnable<T>(tableConfig: TableConfig<T>): boolean {
    return tableConfig.columnsCfg.some(col => col.totalConverter);
  }

  public static create<T>(tableConfig: TableConfig<T>, tableDataSource: MatTableDataSource<TableRow<T>>): TotalRowProvider<T> {
    if (TotalRowProvider.canEnable(tableConfig)) {
      return new TotalRowProvider(tableConfig, tableDataSource);
    }
    return new TotalRowProviderDummy();
  }
}

export class TotalRowProviderDummy extends TotalRowProvider<any> {
  override isEnabled = false;

  constructor() {
    super(EmptyValue.TABLE_CONFIG, EmptyValue.MAT_TABLE_DATA_SOURCE);
  }

  override setTotalRow(): TotalRowProviderDummy {
    return this;
  }

}
