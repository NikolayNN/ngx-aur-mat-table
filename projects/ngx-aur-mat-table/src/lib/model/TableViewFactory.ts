import {TableRow} from "./TableRow";
import {ColumnView, IconView, TextView, TableConfig, ImageView} from "./ColumnConfig";

export class TableViewFactory {

  /**
   * Converts rows into a view format based on table configuration.
   * @param rows The rows of the table.
   * @param tableConfig The configuration of the table.
   * @returns An array of maps representing the view for each row.
   */
  public static toView<T>(rows: TableRow<T>[], tableConfig: TableConfig<T>): Map<string, ColumnView<string>>[] {
    const columnViewMap = new Map<string, ColumnView<(value: TableRow<T>) => string>>();
    tableConfig.columnsCfg.forEach(c => {
      if (c.valueView) {
        columnViewMap .set(c.key, c.valueView)
      }
    })
    return TableViewFactory.toViewInternal(rows, columnViewMap );
  }

  private static toViewInternal<T>(rows: TableRow<T>[], source: Map<string, ColumnView<(value: TableRow<T>) => string>>): Map<string, ColumnView<string>>[] {
    return rows.map(row => TableViewFactory.createColumnConfig(row, source));
  }

  private static createColumnConfig<T>(row: TableRow<T>, columnViewMap: Map<string, ColumnView<(value: TableRow<T>) => string>>): Map<string, ColumnView<string>> {
    const result = new Map<string, ColumnView<string>>();
    columnViewMap.forEach((view, key) => {
      result.set(key, {
        icon: TableViewFactory.configureIcon(view.icon, row),
        text: TableViewFactory.configureText(view.text, row),
        image: TableViewFactory.configureImage(view.image, row),
      });
    });
    return result;
  }

  private static configureIcon<T>(iconSource: IconView<(value: TableRow<T>) => string> | undefined, row: TableRow<T>): IconView<string> | undefined {
    if (!iconSource) return undefined;

    return {
      name: iconSource.name(row),
      color: iconSource.color ? iconSource.color(row) : undefined,
      tooltip: iconSource.tooltip ? iconSource.tooltip(row) : undefined,
      position: iconSource.position,
      wrapper: iconSource.wrapper? {color: iconSource.wrapper.color(row)}: undefined
    }
  }

  private static configureText<T>(textSource: TextView<(value: TableRow<T>) => string> | undefined, row: TableRow<T>): TextView<string> | undefined {
    if (!textSource) return undefined;

    return {
      show: textSource.show,
      tooltip: textSource.tooltip?.(row),
      color: textSource.color?.(row)
    }
  }

  private static configureImage<T>(imageSource: ImageView<(value: TableRow<T>) => string> | undefined, row: TableRow<T>): ImageView<string> | undefined {
    if (!imageSource) return undefined;

    return {
      src: imageSource.src(row),
      width: imageSource.width || undefined,
      height: imageSource.height || undefined
    }
  }
}
