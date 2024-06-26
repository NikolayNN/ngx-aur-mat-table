import {TableConfig} from "../model/ColumnConfig";
import {PageEvent} from "@angular/material/paginator";

export class NgxAurTablePageEventUtils {
  public static createEmpty(tableConfig: TableConfig<any>): PageEvent {
    return {
      pageSize: tableConfig.pageableCfg!.size,
      pageIndex: 0,
      previousPageIndex: 0,
      length: 0
    }
  }
}
