import {Injectable, ViewContainerRef} from "@angular/core";
import {AurDragDropManager, AurDragDropMapping, TableRow} from "ngx-aur-mat-table";
import {Customer} from "../../shared/model/customer";
import {CustomerDragPreviewComponent} from "./customer-drag-preview/customer-drag-preview.component";
import {of} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class CustomerDragDropManagerService {

  private _manager: AurDragDropManager = AurDragDropManager.empty();

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
          return of(ctx.targetDataset.concat(ctx.sourceData)); // Объединяем набор данных TARGET с sourceData
        },
        grabFn: ctx => {
          const removeRowIds = new Set(ctx.sourceData.map(s => s.id))
          return of(ctx.sourceDataset.filter(row => !removeRowIds.has(row.id))); // Фильтруем sourceDataset, исключая sourceData
        },
        preview: CustomerDragPreviewComponent
      } as AurDragDropMapping<TableRow<Customer>, TableRow<Customer>>,
      {
        sourceName: 'first',
        targetName: 'third',
        dropFn: ctx => {
          return of(ctx.targetDataset.concat(ctx.sourceData)); // Объединяем набор данных TARGET с sourceData
        },
        grabFn: ctx => {
          const removeRowIds = new Set(ctx.sourceData.map(s => s.id))
          return of(ctx.sourceDataset.filter(row => !removeRowIds.has(row.id))); // Фильтруем sourceDataset, исключая sourceData
        },
        preview: CustomerDragPreviewComponent
      } as AurDragDropMapping<TableRow<Customer>, TableRow<Customer>>
    ]
  }
}
