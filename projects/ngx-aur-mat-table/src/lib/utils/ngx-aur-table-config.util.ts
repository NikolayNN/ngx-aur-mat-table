import { ActionConfig, ColumnConfig, DEFAULT_ACTION_COLUMN, TableConfig } from "../model/ColumnConfig";

export class NgxAurTableConfigUtil {

  public static keys(config: TableConfig<any>): string[] {
    return this.columnCfgs(config).map(c => c.key);
  }

  private static columnCfgs(config: TableConfig<any>): ColumnConfig<any>[] {
    return config.columnsCfg;
  }

  /**
   * @return Map, где ключ — это 'key', а значение — это 'name'
   */
  public static keyNameMap(config: TableConfig<any>): Map<string, string> {
    return new Map(this.columnCfgs(config).map(cfg => [cfg.key, cfg.name]));
  }

  /** actionCfg (объект | массив | undefined) → массив включённых конфигов (enable !== false). */
  public static actionConfigs<T>(config: TableConfig<T>): ActionConfig<T>[] {
    const raw = config.actionCfg;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.filter(cfg => !!cfg && cfg.enable !== false);
  }

  /** Имя колонки для конфига: key или историческое 'tbl_actions'. */
  public static actionColumnName(cfg: ActionConfig<any>): string {
    return cfg.key ?? DEFAULT_ACTION_COLUMN;
  }

  /** Уникальные имена включённых action-колонок (для whitelist в removeWrongKeys). */
  public static actionColumnNames(config: TableConfig<any>): string[] {
    return [...new Set(this.actionConfigs(config).map(c => this.actionColumnName(c)))];
  }
}
