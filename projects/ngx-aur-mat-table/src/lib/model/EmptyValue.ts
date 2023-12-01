import {ActionConfig, IndexConfig, SelectionConfig, TableConfig, TableRow} from "ngx-aur-mat-table";
import {MatTableDataSource} from "@angular/material/table";

export class EmptyValue {

  public static readonly SELECTION_CONFIG: SelectionConfig = {
    enable: false,
  }

  public static readonly ACTION_CONFIG: ActionConfig<any> = {
    enable: false,
    actions: []
  }

  public static readonly INDEX_CONFIG: IndexConfig = {
    enable: false,
  }


  public static readonly TABLE_CONFIG: TableConfig<any> = {
    columnsCfg: [],
    selectionCfg: EmptyValue.SELECTION_CONFIG,
    actionCfg: EmptyValue.ACTION_CONFIG,
    indexCfg: EmptyValue.INDEX_CONFIG
  }

  public static readonly MAT_TABLE_DATA_SOURCE: MatTableDataSource<TableRow<any>> = new MatTableDataSource();

  public static readonly DISPLAY_COLUMNS: string[] = [];
}
