import {ColumnConfig, TableConfig} from "../model/ColumnConfig";
import {SelectionProvider} from "../providers/SelectionProvider";
import {IndexProvider} from "../providers/IndexProvider";
import {RowActionProvider} from "../providers/RowActionProvider";

export class NgxAurTableConfigUtil {
  private static readonly GENERATED_KEYS = new Set([SelectionProvider.COLUMN_NAME, IndexProvider.COLUMN_NAME, RowActionProvider.COLUMN_NAME]);

  public static keys(config: TableConfig<any>): string[] {
    return this.managingColumns(config).map(c => c.key);
  }

  private static managingColumns(config: TableConfig<any>): ColumnConfig<any>[] {
    return config.columnsCfg.filter(cfg => !this.GENERATED_KEYS.has(cfg.key))
  }

  /**
   * @return Map where the key is 'key' and the value is 'name'
   */
  public static keyNameMap(config: TableConfig<any>): Map<string, string> {
    return new Map(this.managingColumns(config).map(cfg => [cfg.key, cfg.name]));
  }
}
