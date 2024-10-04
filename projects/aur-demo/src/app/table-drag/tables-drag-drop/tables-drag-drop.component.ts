import {Component, OnInit} from '@angular/core';
import {
  AurDragDropManager, AurDragDropMapping
} from "../../../../../ngx-aur-mat-table/src/lib/drag-drop/aur-drag-drop.manager";
import {Customer} from "../../shared/model/customer";
import {TableRow} from "ngx-aur-mat-table";

@Component({
  selector: 'app-tables-drag-drop',
  templateUrl: './tables-drag-drop.component.html',
  styleUrl: './tables-drag-drop.component.scss'
})
export class TablesDragDropComponent implements OnInit {

  dragDropManager = AurDragDropManager.empty();

  ngOnInit(): void {
    const mapping: AurDragDropMapping<TableRow<Customer>, TableRow<Customer>> = {
      sourceName: 'first',
      targetName: 'second',
      dropFn: ctx => {
        return ctx.targetDataset.concat(ctx.sourceData); // Объединяем набор данных TARGET с sourceData
      },
      grabFn: ctx => {
        return ctx.sourceDataset.filter(row => row.id !== ctx.sourceData.id); // Фильтруем sourceDataset, исключая sourceData
      }
    }

    this.dragDropManager = new AurDragDropManager([
      mapping
    ]);
  }

}
