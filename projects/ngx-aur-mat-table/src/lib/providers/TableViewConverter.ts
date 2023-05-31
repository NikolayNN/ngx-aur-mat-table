import {TableRow} from "../model/TableRow";
import {ColumnView, IconView, TextView, TableConfig, ImageView} from "../model/ColumnConfig";

export class TableViewConverter {

  public static toView<T>(rows: TableRow<T>[], tableConfig: TableConfig<T>): Map<string, ColumnView<string>>[] {
    const result: Map<string, ColumnView<(value: TableRow<T>) => string>> = new Map();
    tableConfig.columnsCfg.forEach(c => {
      if (c.valueView) {
        result.set(c.key, c.valueView)
      }
    })
    return this.toViewInternal(rows, result);
  }

  private static toViewInternal<T>(rows: TableRow<T>[], source: Map<string, ColumnView<(value: TableRow<T>) => string>>): Map<string, ColumnView<string>>[] {
    return rows.map(row => this.columnConfig(source, row));
  }

  private static columnConfig<T>(source: Map<string, ColumnView<(value: TableRow<T>) => string>>, row: TableRow<T>): Map<string, ColumnView<string>> {
    const result: Map<string, ColumnView<string>> = new Map();
    source.forEach((source, key) => {
      const value: ColumnView<string> = {
        icon: this.iconConfig(source.icon, row),
        text: this.textConfig(source.text, row),
        image: this.imageConfig(source.image, row)
      }
      result.set(key, value)
    });
    return result;
  }

  private static iconConfig<T>(iconSource: IconView<(value: TableRow<T>) => string> | undefined, row: TableRow<T>): IconView<string> | undefined {
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

  private static textConfig<T>(textSource: TextView<(value: TableRow<T>) => string> | undefined, row: TableRow<T>): TextView<string> | undefined {
    if (!textSource) {
      return undefined;
    }
    return {
      show: textSource.show,
      tooltip: textSource.tooltip ? textSource.tooltip(row) : undefined,
      color: textSource.color ? textSource.color(row) : undefined,
    }
  }

  private static imageConfig<T>(imageSource: ImageView<(value: TableRow<T>) => string> | undefined, row: TableRow<T>): ImageView<string> | undefined {
    if (!imageSource) {
      return undefined;
    }
    return {
      src: imageSource.src(row),
      width: imageSource.width || undefined,
      height: imageSource.height || undefined
    }
  }
}
