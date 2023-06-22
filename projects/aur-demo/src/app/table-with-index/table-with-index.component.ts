import {Component} from '@angular/core';
import {IndexConfig, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
  selector: 'app-table-with-index',
  templateUrl: './table-with-index.component.html',
  styleUrls: ['./table-with-index.component.scss']
})
export class TableWithIndexComponent {

  indexable: IndexConfig = {
    enable: true,
    offset: 1
  }

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
    indexCfg: {enable: true, offset: 1}
  }
  tableData = CustomerGenerator.generate(10);
}
