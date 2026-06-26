import { Component } from '@angular/core';
import {StyleBuilder, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
    selector: 'app-table-with-sub-footer',
    templateUrl: './table-with-sub-footer.component.html',
    styleUrls: ['./table-with-sub-footer.component.scss'],
    standalone: false
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
    bodyRowCfg: {
      highlightCfg: {
        styleCfg: {
          style: StyleBuilder.Row.builder()
            .background('blue').color('red')
            .border(b => b.allBorders('2px', StyleBuilder.BorderStyle.SOLID, 'green')),
        },
        cancelable: true,
      },
      hoverCfg: { pointer: true },
    },
  }
  tableData: Customer[] = CustomerGenerator.generate(10);

}
