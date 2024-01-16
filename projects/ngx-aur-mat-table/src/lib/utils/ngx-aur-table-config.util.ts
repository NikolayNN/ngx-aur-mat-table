import {ColumnConfig, TableConfig} from "../model/ColumnConfig";
import {SelectionProvider} from "../providers/SelectionProvider";
import {IndexProvider} from "../providers/IndexProvider";
import {RowActionProvider} from "../providers/RowActionProvider";

export class NgxAurTableConfigUtil {

  public static keys(config: TableConfig<any>): string[] {
    return this.columnCfgs(config).map(c => c.key);
  }

  private static columnCfgs(config: TableConfig<any>): ColumnConfig<any>[] {
    return config.columnsCfg;
  }

  /**
   * @return Map where the key is 'key' and the value is 'name'
   */
  public static keyNameMap(config: TableConfig<any>): Map<string, string> {
    return new Map(this.columnCfgs(config).map(cfg => [cfg.key, cfg.name]));
  }
}
