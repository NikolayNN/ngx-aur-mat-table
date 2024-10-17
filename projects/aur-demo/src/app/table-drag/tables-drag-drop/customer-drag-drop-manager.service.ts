import {Injectable, ViewContainerRef} from "@angular/core";
import {Customer} from "../../shared/model/customer";
import {CustomerDragPreviewComponent} from "./customer-drag-preview/customer-drag-preview.component";
import {delay, filter, Observable, of, Subject, tap} from "rxjs";
import {AurDragDropManager,} from "../../../../../ngx-aur-mat-table/src/lib/drag-drop/aur-drag-drop.manager";
import {AurDragDropMapping, AurDragPreviewMappings, TableRow} from "ngx-aur-mat-table";

export interface IndexableRowData<T> {
  index: number,
  data: T
}

@Injectable({
  providedIn: 'root'
})
export class CustomerDragDropManagerService {

  private _manager = AurDragDropManager.empty();

  constructor() {
  }


  private _deleteFromFirstTableEvent = new Subject<TableRow<Customer>[]>();
  private _addToSecondTableEvent = new Subject<Customer[]>();


  get deleteFromFirstTableEvent(): Observable<TableRow<Customer>[]> {
    return this._deleteFromFirstTableEvent.asObservable().pipe(filter(r => r?.length > 0));
  }

  get addToSecondTableEvent(): Observable<Customer[]> {
    return this._addToSecondTableEvent.asObservable().pipe(filter(r => r?.length > 0));
  }

  get manager(): AurDragDropManager {
    return this._manager;
  }

// вызывается в общем контейнере для всех drag & drop компонентов
  public init(ref: ViewContainerRef) {
    const dragDropMappings = this.createDragDropMappings();
    const dragPreviewMappings = this.createDragPreviewMappings();
    this._manager = new AurDragDropManager(ref, dragDropMappings, dragPreviewMappings);
  }

  private createDragDropMappings(): AurDragDropMapping<any, any>[] {
    return [
      {
        sourceName: 'first',
        targetName: 'second',
        afterDropFn: ctx => {
          return of({})
            .pipe(
              delay(2000),
              tap(() => {
                  this._deleteFromFirstTableEvent.next(ctx.sourceData);
                  this._addToSecondTableEvent.next(ctx.sourceData.map(row => row.rowSrc));
              })
            );
        },
        preview: CustomerDragPreviewComponent
      } as AurDragDropMapping<TableRow<Customer>, TableRow<Customer>>
    ]
  }

  private createDragPreviewMappings(): AurDragPreviewMappings<any>[] {
    return [
      {
        sourceName: 'first',
        preview: CustomerDragPreviewComponent
      }
    ]

  }
}
