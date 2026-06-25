import {TableRow} from "./TableRow";
import {TableConfig} from "./ColumnConfig";
import {StyleBuilder} from "../style-builder/style-builder";

export interface ResolvedRowStyle {
  class: string | null;
  style: StyleBuilder.Row | string | null;
}

export class RowStyleFactory {

  /**
   * Разрешает `bodyRowCfg.styleCfg` в массив по строкам, индексированный по `row.rowId`.
   * Возвращает пустой массив, когда хук не сконфигурирован. Стили хранятся в сыром виде
   * (не собранные `StyleBuilder.Row | string`), чтобы компонент мог вызвать `overrideWith()`/`build()` во время отрисовки.
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
