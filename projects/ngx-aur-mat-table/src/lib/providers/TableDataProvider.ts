import {ColumnConfig} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";

export class TableDataProvider<T> {

  public convert(data: T[], config: ColumnConfig<T>[]): TableRow<T>[] {
    let id = 0;
    return data.map(d => this.tableRow(id++, d, config));
  }

  private tableRow(id: number, obj: T, config: ColumnConfig<T>[]): TableRow<T> {
    const row = new TableRow<T>(id, obj);
    config.forEach(c => row[c.key] = c.valueConverter(obj));
    return row;
  }
}
