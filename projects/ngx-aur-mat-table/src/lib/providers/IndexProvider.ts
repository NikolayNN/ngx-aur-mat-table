import {ColumnConfig} from "../model/TableConfig";

export interface IndexConfig {
  enable: true,

  /** смещение для первого индекса например 1 чтобы нумерация началась с 1 по умолчанию от нуля */
  offset?: number,

  headerColumn?: ColumnConfig<string>

  /** название для колонки, по умолчанию ''*/
  name?: string;
}

export class IndexProvider {
  public readonly COLUMN_NAME = 'tbl_index';

  constructor(indexConfig: IndexConfig, columns: string[]) {
    if (indexConfig && indexConfig.enable) {
      columns.unshift(this.COLUMN_NAME);
    }
  }
}
