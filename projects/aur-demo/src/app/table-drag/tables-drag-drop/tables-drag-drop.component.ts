import {Component, OnInit, ViewContainerRef} from '@angular/core';
import {CustomerDragDropManagerService} from "./customer-drag-drop-manager.service";
import {CustomerGenerator} from "../../shared/generator/CustomerGenerator";
import {tap} from "rxjs";

@Component({
  selector: 'app-tables-drag-drop',
  templateUrl: './tables-drag-drop.component.html',
  styleUrl: './tables-drag-drop.component.scss'
})
export class TablesDragDropComponent implements OnInit {
  tableDataFirst = CustomerGenerator.generate(5);
  tableDataSecond = CustomerGenerator.generate(5);
  tableDataThird  = CustomerGenerator.generate(3);

  constructor(protected readonly dragDropManagerService: CustomerDragDropManagerService,
              private readonly containerRef: ViewContainerRef) {
  }

  ngOnInit(): void {
    this.dragDropManagerService.init(this.containerRef);

    this.dragDropManagerService.addToSecondTableEvent
      .subscribe(add => this.tableDataSecond = this.tableDataSecond.concat(add));

    this.dragDropManagerService.deleteFromFirstTableEvent
      .subscribe(deletedRows => {
        // Создаем Set для хранения индексов, которые нужно удалить
        const indicesToDelete = new Set(deletedRows.map(row => row.id));

        // Отфильтровываем элементы, оставляя только те, которых нет в Set indicesToDelete
        this.tableDataFirst = this.tableDataFirst.filter((_, index) => !indicesToDelete.has(index));
      });
  }
}
