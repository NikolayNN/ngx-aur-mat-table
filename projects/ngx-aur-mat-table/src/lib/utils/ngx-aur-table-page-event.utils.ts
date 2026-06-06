import {TableConfig} from "../model/ColumnConfig";
import {PageEvent} from "@angular/material/paginator";

export class NgxAurTablePageEventUtils {
  /**
   * @deprecated Not needed with the `pageSource` API — the table performs the initial
   * load itself. Kept for the legacy manual server-pagination path.
   */
  public static createEmpty(tableConfig: TableConfig<any>): PageEvent {
    return {
      pageSize: tableConfig.paginationCfg!.size,
      pageIndex: 0,
      previousPageIndex: 0,
      length: 0
    }
  }
}
