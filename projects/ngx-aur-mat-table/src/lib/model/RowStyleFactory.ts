import {TableRow} from "./TableRow";
import {TableConfig} from "./ColumnConfig";
import {StyleBuilder} from "../style-builder/style-builder";

export interface ResolvedRowStyle {
  class: string | null;
  style: StyleBuilder.Row | string | null;
}

export class RowStyleFactory {

  /**
   * Resolves bodyRowCfg.styleCfg into a per-row array indexed by row.id.
   * Returns an empty array when the hook is not configured. Styles are kept raw
   * (un-built StyleBuilder.Row | string) so the component can overrideWith()/build() at render time.
   */
  public static toRowStyles<T>(rows: TableRow<T>[], tableConfig: TableConfig<T>): ResolvedRowStyle[] {
    const cfg = tableConfig.bodyRowCfg?.styleCfg;
    if (!cfg || (!cfg.class && !cfg.style)) {
      return [];
    }
    return rows.map(row => ({
      class: cfg.class ? cfg.class(row) : null,
      style: cfg.style ? cfg.style(row) : null,
    }));
  }
}
