import {TableConfig} from "ngx-aur-mat-table";
import {PageEvent} from "@angular/material/paginator";

export class PageEventUtils {
  public static createEmpty(tableConfig: TableConfig<any>): PageEvent {
    return {
      pageSize: tableConfig.pageableCfg!.size,
      pageIndex: 0,
      previousPageIndex: 0,
      length: 0
    }
  }
}
