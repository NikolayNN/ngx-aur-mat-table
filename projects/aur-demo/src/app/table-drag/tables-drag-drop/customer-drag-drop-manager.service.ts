import {Injectable, ViewContainerRef} from "@angular/core";
import {AurDragDropManager, AurDragDropMapping, TableRow} from "ngx-aur-mat-table";
import {Customer} from "../../shared/model/customer";
import {CustomerDragPreviewComponent} from "./customer-drag-preview/customer-drag-preview.component";

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
    const mapping: AurDragDropMapping<TableRow<Customer>, TableRow<Customer>> = {
      sourceName: 'first',
      targetName: 'second',
      dropFn: ctx => {
        return ctx.targetDataset.concat(ctx.sourceData); // Объединяем набор данных TARGET с sourceData
      },
      grabFn: ctx => {
        return ctx.sourceDataset.filter(row => row.id !== ctx.sourceData.id); // Фильтруем sourceDataset, исключая sourceData
      },
      preview: CustomerDragPreviewComponent
    }
    return [mapping];
  }
}
