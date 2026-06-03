import {TableRow} from "./TableRow";
import {DecorStyles, TableConfig} from "./ColumnConfig";

export interface ResolvedRowStyle {
  class: string | null;
  style: DecorStyles;
}

export class RowStyleFactory {

  /**
   * Resolves rowStyleCfg into a per-row array indexed by row.id.
   * Returns an empty array when the hook is not configured.
   */
  public static toRowStyles<T>(rows: TableRow<T>[], tableConfig: TableConfig<T>): ResolvedRowStyle[] {
    const cfg = tableConfig.rowStyleCfg;
    if (!cfg || (!cfg.class && !cfg.style)) {
      return [];
    }
    return rows.map(row => ({
      class: cfg.class ? cfg.class(row) : null,
      style: cfg.style ? cfg.style(row) : {},
    }));
  }
}
