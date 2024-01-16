import {TableConfig} from "ngx-aur-mat-table";

export class TableConfigUtil {
  public static keys(config: TableConfig<any>): string[] {
    return config.columnsCfg.map(config => config.key);
  }
}
