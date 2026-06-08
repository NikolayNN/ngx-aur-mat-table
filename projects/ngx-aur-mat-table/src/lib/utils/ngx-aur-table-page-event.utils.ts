import {TableConfig} from "../model/ColumnConfig";
import {PageEvent} from "@angular/material/paginator";

export class NgxAurTablePageEventUtils {
  /**
   * @deprecated Не нужно с API `pageSource` — таблица сама выполняет начальную
   * загрузку. Сохранено для устаревшего пути ручной серверной пагинации.
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
