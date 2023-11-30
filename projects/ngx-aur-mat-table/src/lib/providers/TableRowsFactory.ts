import {ColumnConfig} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";

export class TableRowsFactory {

  /**
   * Converts an array of data objects into an array of TableRow objects.
   * @param data Array of data objects to be converted.
   * @param config Configuration settings for each column.
   * @returns An array of TableRow objects.
   */
  public static convert<T>(data: T[], config: ColumnConfig<T>[]): TableRow<T>[] {
    return data.map((obj, index) => this.createTableRow(index, obj, config));
  }

  private static createTableRow<T>(id: number, obj: T, config: ColumnConfig<T>[]): TableRow<T> {
    const row = new TableRow<T>(id, obj);
    config.forEach(c => row[c.key] = c.valueConverter(obj));
    return row;
  }
}
