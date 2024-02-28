import { Component, OnInit } from '@angular/core';
import {TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
  selector: 'app-table-with-sub-footer',
  templateUrl: './table-with-sub-footer.component.html',
  styleUrls: ['./table-with-sub-footer.component.scss']
})
export class TableWithSubFooterComponent {

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
    clickCfg: {
      pointer: true,
      highlightClicked: {
        background: 'blue',
        color: 'red',
        border: '2px solid green'
      },
      cancelable: true
    },
  }
  tableData: Customer[] = CustomerGenerator.generate(10);

}
