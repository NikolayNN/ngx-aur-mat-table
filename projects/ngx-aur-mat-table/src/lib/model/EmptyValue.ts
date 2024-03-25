import {ActionConfig, IndexConfig, PaginationConfig, SelectionConfig, TableConfig} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";
import {MatLegacyTableDataSource as MatTableDataSource} from "@angular/material/legacy-table";

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

  public static readonly PAGINATION_CONFIG: PaginationConfig = {
    enable: false,
    size: 0,
    sizes: []
  }


  public static readonly TABLE_CONFIG: TableConfig<any> = {
    columnsCfg: [],
    selectionCfg: EmptyValue.SELECTION_CONFIG,
    actionCfg: EmptyValue.ACTION_CONFIG,
    indexCfg: EmptyValue.INDEX_CONFIG,
    pageableCfg: EmptyValue.PAGINATION_CONFIG
  }

  public static readonly MAT_TABLE_DATA_SOURCE: MatTableDataSource<TableRow<any>> = new MatTableDataSource();

  public static readonly RESIZE_OBSERVER = new ResizeObserver(() => {
  })
}
