import {Component} from '@angular/core';
import {BorderStyle, BorderStyleBuilder, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";
import {RowStyleBuilder} from "../../../../ngx-aur-mat-table/src/lib/style-builder/row.style-builder";

@Component({
  selector: 'app-table-with-total',
  templateUrl: './table-with-total.component.html',
  styleUrls: ['./table-with-total.component.scss']
})
export class TableWithTotalComponent {
  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      {
        name: 'customers name',
        key: 'name',
        valueConverter: v => v.name,
        totalConverter: v => v.length
      },
      {
        name: 'customers age',
        key: 'age',
        valueConverter: v => v.age,
        totalConverter: v => v.map(v => v.rowSrc.age).reduce((sum, age) => sum + age, 0)
      }
    ],
    tableView: {
      totalRowView: {
        style: new RowStyleBuilder()
          .color('blue')
          .background('lightgray')
          .border(borderBuilder => borderBuilder.top('3px', BorderStyle.SOLID, 'RED'))
          .build()
      }
    }
  }
  tableData: Customer[] = CustomerGenerator.generate(10);
}
