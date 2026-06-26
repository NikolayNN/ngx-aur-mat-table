import {Component} from '@angular/core';
import {StyleBuilder, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
    selector: 'app-table-highlight-clicked-row',
    templateUrl: './table-highlight-clicked-row.component.html',
    styleUrls: ['./table-highlight-clicked-row.component.scss'],
    standalone: false
})
export class TableHighlightClickedRowComponent {

  highlightedCustomer: Customer | null = null;

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'customers name', key: 'name', valueConverter: v => v.name },
      { name: 'customers age', key: 'age', valueConverter: v => v.age },
    ],
    bodyRowCfg: {
      highlightCfg: {
        mode: 'controlled',
        cancelable: true,
        styleCfg: {
          style: StyleBuilder.Row.builder()
            .background('blue').color('red')
            .border(b => b.allBorders('2px', StyleBuilder.BorderStyle.SOLID, 'green')),
        },
      },
      hoverCfg: { pointer: true },
    },
    stickyCfg: { header: true }
  }
  tableData: Customer[] = CustomerGenerator.generate(30);
}
