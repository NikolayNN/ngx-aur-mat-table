import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {AurDragPreviewComponent, TableRow} from "ngx-aur-mat-table";
import {Customer} from "../../../shared/model/customer";

@Component({
  selector: 'app-customer-drag-preview',
  templateUrl: './customer-drag-preview.component.html',
  styleUrl: './customer-drag-preview.component.scss'
})
export class CustomerDragPreviewComponent implements AurDragPreviewComponent<TableRow<Customer>>, OnInit, OnDestroy {
  // @ts-ignore
  @Input() data: TableRow<Customer>;

  ngOnInit(): void {
    console.log('INIT', this.data);
  }

  ngOnDestroy() {
    console.log('Destroy')
  }
}
