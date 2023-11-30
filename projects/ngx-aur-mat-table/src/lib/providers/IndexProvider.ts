import {ColumnView, IndexConfig, TableConfig} from "../model/ColumnConfig";


export class IndexProvider {
  public readonly COLUMN_NAME = 'tbl_index';
  public headerView: ColumnView<string> | undefined;
  public name: string;

  public offset: number;

  constructor(indexConfig: IndexConfig, columns: string[]) {
    if (indexConfig) {
      columns.unshift(this.COLUMN_NAME);
    }
    this.headerView = indexConfig.headerColumn;
    this.name = indexConfig.name || '';
    this.offset = indexConfig.offset || 0;
  }

  public static canCreate<T>(tableConfig: TableConfig<T>): boolean {
    return (tableConfig.indexCfg && tableConfig.indexCfg.enable) || false;
  }

  public static create<T>(tableConfig: TableConfig<T>, displayedColumns: string[]): IndexProvider {
    return new IndexProvider(<IndexConfig>tableConfig.indexCfg, displayedColumns);
  }
}
