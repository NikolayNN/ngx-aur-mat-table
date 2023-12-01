import {SelectionConfig, TableConfig, TableRow} from "ngx-aur-mat-table";
import {MatTableDataSource} from "@angular/material/table";
import {SelectionModel} from "@angular/cdk/collections";

export class EmptyValue {

  public static readonly SELECTION_CONFIG: SelectionConfig = {
    enable: false,
  }
  public static readonly TABLE_CONFIG: TableConfig<any> = {
    columnsCfg: [],
    selectionCfg: EmptyValue.SELECTION_CONFIG

  }

  public static readonly MAT_TABLE_DATA_SOURCE: MatTableDataSource<TableRow<any>> = new MatTableDataSource();

  public static readonly DISPLAY_COLUMNS: string[] = [];
}
