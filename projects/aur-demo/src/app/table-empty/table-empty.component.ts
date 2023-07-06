import {Component} from '@angular/core';
import {TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";

@Component({
  selector: 'app-table-empty',
  templateUrl: './table-empty.component.html',
  styleUrls: ['./table-empty.component.scss']
})
export class TableEmptyComponent {
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
    ]
  }
  tableData: Customer[] = [];

}
