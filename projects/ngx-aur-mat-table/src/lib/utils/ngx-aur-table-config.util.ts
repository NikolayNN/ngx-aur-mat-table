import {TableConfig} from "../model/ColumnConfig";

export class NgxAurTableConfigUtil {
  public static keys(config: TableConfig<any>): string[] {
    return config.columnsCfg.map(config => config.key);
  }

  public static namedKeys(config: TableConfig<any>): {name: string, key: string}[] {
    return config.columnsCfg.map(cfg => ({name: cfg.name, key: cfg.key}));
  }

  /**
   * @return Map where the key is 'key' and the value is 'name'
   */
  public static keyNameMap(config: TableConfig<any>): Map<string, string> {
    return new Map(config.columnsCfg.map(cfg => [cfg.key, cfg.name]));
  }
}
