import {ColumnConfig} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";
import {MatTableDataSource} from "@angular/material/table";
import {TableRowsFactory} from "./TableRowsFactory";

export class MatTableDataSourceFactory {
  /**
   * Преобразует массив объектов данных в MatTableDataSource.
   * @param data Массив объектов данных для преобразования.
   * @param config Настройки конфигурации для каждой колонки.
   * @returns MatTableDataSource.
   */
  public static convert<T>(data: T[], config: ColumnConfig<T>[]): MatTableDataSource<TableRow<T>> {
    let tableRows = TableRowsFactory.convert(data, config);
    return new MatTableDataSource<TableRow<T>>(tableRows);
  }
}
