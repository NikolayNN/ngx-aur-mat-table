import {Component, Input, OnDestroy, OnInit} from '@angular/core';

import {Customer} from "../../../shared/model/customer";
import {TableRow} from "ngx-aur-mat-table";
import {
  AurDragPreviewComponent
} from "../../../../../../ngx-aur-mat-table/src/lib/drag-drop/model/aur-drag-preview-component";


@Component({
  selector: 'app-customer-drag-preview',
  templateUrl: './customer-drag-preview.component.html',
  styleUrl: './customer-drag-preview.component.scss'
})
export class CustomerDragPreviewComponent implements AurDragPreviewComponent<TableRow<Customer>>, OnInit, OnDestroy {
  // @ts-ignore
  @Input() data: TableRow<Customer>[];

  ngOnInit(): void {
    console.log('INIT', this.data);
  }

  ngOnDestroy() {
    console.log('Destroy')
  }
}
