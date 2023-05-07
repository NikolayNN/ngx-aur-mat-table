import {ColumnConfig} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";

export class TableDataProvider<T> {

  public convert(data: T[], config: ColumnConfig<T>[]): TableRow<T>[] {
    return data.map(d => this.tableRow(d, config));
  }

  private tableRow(obj: T, config: ColumnConfig<T>[]): TableRow<T> {
    const row = new TableRow<T>(obj);
    config.forEach(c => row[c.key] = c.valueConverter(obj));
    return row;
  }
}
