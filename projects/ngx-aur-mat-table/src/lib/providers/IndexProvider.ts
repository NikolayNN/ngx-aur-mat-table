import {ColumnViewConfig, IndexConfig} from "../model/ColumnConfig";


export class IndexProvider {
  public readonly COLUMN_NAME = 'tbl_index';
  public headerView: ColumnViewConfig<string> | undefined;
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
}
