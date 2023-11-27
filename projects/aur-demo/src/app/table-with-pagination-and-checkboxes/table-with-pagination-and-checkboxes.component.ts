import { Component, OnInit } from '@angular/core';
import {ActionEvent, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";
import {Action} from "rxjs/internal/scheduler/Action";

@Component({
  selector: 'app-table-with-pagination-and-checkboxes',
  templateUrl: './table-with-pagination-and-checkboxes.component.html',
  styleUrls: ['./table-with-pagination-and-checkboxes.component.scss']
})
export class TableWithPaginationAndCheckboxesComponent {

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      {
        name: 'customers name',
        key: 'name',
        valueConverter: v => v.name
      },
      {
        name: 'customers age',
        key: 'age',
        valueConverter: v => v.age
      }
    ],
    selectionCfg: {
      enable: true,
      multiple: true,
      showSelectedCount: true,
      position: "start",
      actions: [
        {
          action: 'delete',
          icon: {
            name: 'delete',
            color: 'red',
            tooltip: 'delete selected rows'
          }
        }
      ],
    },
    pageableCfg: {
      enable: true
    }
  }
  tableData: Customer[] = CustomerGenerator.generate(100);

  onRowSelectedRowAction($event: ActionEvent<Customer[]>) {
    alert(`Click Action: ${$event.action}: ${$event.value.length} rows`)
  }
}
