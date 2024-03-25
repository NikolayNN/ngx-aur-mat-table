import {ColumnConfig} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";
import {MatLegacyTableDataSource as MatTableDataSource} from "@angular/material/legacy-table";
import {TableRowsFactory} from "./TableRowsFactory";

export class MatTableDataSourceFactory {
  /**
   * Converts an array of data objects into MatTableDataSource.
   * @param data Array of data objects to be converted.
   * @param config Configuration settings for each column.
   * @returns MatTableDataSource.
   */
  public static convert<T>(data: T[], config: ColumnConfig<T>[]): MatTableDataSource<TableRow<T>> {
    let tableRows = TableRowsFactory.convert(data, config);
    return new MatTableDataSource<TableRow<T>>(tableRows);
  }
}
