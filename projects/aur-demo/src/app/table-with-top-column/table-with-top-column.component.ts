import {Component} from '@angular/core';
import {TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
  selector: 'app-table-with-top-column',
  templateUrl: './table-with-top-column.component.html',
  styleUrl: './table-with-top-column.component.scss'
})
export class TableWithTopColumnComponent {
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
  tableData: Customer[] = CustomerGenerator.generate(10);
  protected readonly alert = alert;
}
