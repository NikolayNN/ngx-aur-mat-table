import {Component, OnInit, ViewContainerRef} from '@angular/core';
import {CustomerDragDropManagerService} from "./customer-drag-drop-manager.service";

@Component({
  selector: 'app-tables-drag-drop',
  templateUrl: './tables-drag-drop.component.html',
  styleUrl: './tables-drag-drop.component.scss'
})
export class TablesDragDropComponent implements OnInit {

  constructor(protected readonly dragDropManagerService: CustomerDragDropManagerService,
              private readonly containerRef: ViewContainerRef) {
  }

  ngOnInit(): void {
    this.dragDropManagerService.init(this.containerRef);
  }
}
