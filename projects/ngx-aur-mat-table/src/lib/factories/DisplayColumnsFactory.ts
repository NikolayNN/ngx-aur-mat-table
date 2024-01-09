import {ColumnConfig, TableConfig} from "../model/ColumnConfig";

export class DisplayColumnsFactory {
  public static create<T>(tableConfig: TableConfig<T>): string[] {
    return tableConfig.columnsCfg.map((tableColumn: ColumnConfig<any>) => tableColumn.key)
  }
}
