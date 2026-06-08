import {ColumnConfig} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";

export class TableRowsFactory {

  /**
   * Преобразует массив объектов данных в массив объектов TableRow.
   * @param data Массив объектов данных для преобразования.
   * @param config Настройки конфигурации для каждой колонки.
   * @returns Массив объектов TableRow.
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
