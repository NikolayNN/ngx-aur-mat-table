import {Injectable, ViewContainerRef} from "@angular/core";
import {Customer} from "../../shared/model/customer";
import {CustomerDragPreviewComponent} from "./customer-drag-preview/customer-drag-preview.component";
import {delay, of} from "rxjs";
import {
  AurDragDropManager,
} from "../../../../../ngx-aur-mat-table/src/lib/drag-drop/aur-drag-drop.manager";
import {TableRow} from "ngx-aur-mat-table";
import {AurDragDropMapping} from "../../../../../ngx-aur-mat-table/src/lib/drag-drop/model/aur-drag-drop-mapping";

@Injectable({
  providedIn: 'root'
})
export class CustomerDragDropManagerService {

  private _manager= AurDragDropManager.empty();

  constructor() {
  }

  get manager(): AurDragDropManager {
    return this._manager;
  }

// вызывается в общем контейнере для всех drag & drop компонентов
  public init(ref: ViewContainerRef) {
    const dragDropMappings = this.createDragDropMappings();
    this._manager = new AurDragDropManager(ref, dragDropMappings);
  }

  private createDragDropMappings(): AurDragDropMapping<any, any>[] {
    return [
      {
        sourceName: 'first',
        targetName: 'second',
        dropFn: ctx => {
          return of({isValid: true, updatedDataset: ctx.targetDataset.concat(ctx.sourceData)}).pipe(delay(5000)); // Объединяем набор данных TARGET с sourceData
        },
        grabFn: ctx => {
          const removeRowIds = new Set(ctx.sourceData.map(s => s.id))
          return of(ctx.sourceDataset.filter(row => !removeRowIds.has(row.id))).pipe(delay(100)); // Фильтруем sourceDataset, исключая sourceData
        },
        preview: CustomerDragPreviewComponent
      } as AurDragDropMapping<TableRow<Customer>, TableRow<Customer>>
    ]
  }
}
