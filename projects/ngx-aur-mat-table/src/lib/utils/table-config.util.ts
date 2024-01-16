import {TableConfig} from "../model/ColumnConfig";

export class TableConfigUtil {
  public static keys(config: TableConfig<any>): string[] {
    return config.columnsCfg.map(config => config.key);
  }
}
