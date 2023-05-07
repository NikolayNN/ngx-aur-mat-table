import {TableRow} from "../model/TableRow";
import {ColumnViewConfig, IconConfig, TextConfig, TableConfig} from "../model/ColumnConfig";

export class TableViewConverter {

  public static toView<T>(rows: TableRow<T>[], tableConfig: TableConfig<T>): Map<string, ColumnViewConfig<string>>[] {
    const result: Map<string, ColumnViewConfig<(value: TableRow<T>) => string>> = new Map();
    tableConfig.columnsCfg.forEach(c => {
      if (c.valueColumn) {
        result.set(c.key, c.valueColumn)
      }
    })
    return this.toViewInternal(rows, result);
  }

  private static toViewInternal<T>(rows: TableRow<T>[], source: Map<string, ColumnViewConfig<(value: TableRow<T>) => string>>): Map<string, ColumnViewConfig<string>>[] {
    return rows.map(row => this.columnConfig(source, row));
  }

  private static columnConfig<T>(source: Map<string, ColumnViewConfig<(value: TableRow<T>) => string>>, row: TableRow<T>): Map<string, ColumnViewConfig<string>> {
    const result: Map<string, ColumnViewConfig<string>> = new Map();
    source.forEach((source, key) => {
      const value: ColumnViewConfig<string> = {
        icon: this.iconConfig(source.icon, row),
        text: this.textConfig(source.text, row)
      }
      result.set(key, value)
    });
    return result;
  }

  private static iconConfig<T>(iconSource: IconConfig<(value: TableRow<T>) => string> | undefined, row: TableRow<T>): IconConfig<string> | undefined {
    if (!iconSource) {
      return undefined;
    }
    return {
      name: iconSource.name(row),
      color: iconSource.color ? iconSource.color(row) : undefined,
      tooltip: iconSource.tooltip ? iconSource.tooltip(row) : undefined,
      position: iconSource.position,
    }
  }

  private static textConfig<T>(textSource: TextConfig<(value: TableRow<T>) => string> | undefined, row: TableRow<T>): TextConfig<string> | undefined {
    if (!textSource) {
      return undefined;
    }
    return {
      show: textSource.show,
      tooltip: textSource.tooltip ? textSource.tooltip(row) : undefined,
      color: textSource.color ? textSource.color(row) : undefined,
    }
  }
}
