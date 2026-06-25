import { Component } from '@angular/core';
import { StyleBuilder, TableConfig, TableRow } from 'ngx-aur-mat-table';
import { Customer } from '../shared/model/customer';
import { CustomerGenerator } from '../shared/generator/CustomerGenerator';
import FontWeight = StyleBuilder.FontWeight;

@Component({
  selector: 'app-table-with-row-style',
  templateUrl: './table-with-row-style.component.html',
  styleUrls: ['./table-with-row-style.component.scss'],
  standalone: false,
})
export class TableWithRowStyleComponent {

  /** every 5th row is treated as a bold "subtotal" row */
  private isSubtotal = (row: TableRow<Customer>): boolean => row.rowId % 5 === 4;

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'name', key: 'name', valueConverter: v => v.name },
      { name: 'age', key: 'age', valueConverter: v => v.age },
    ],
    bodyRowCfg: {
      hoverCfg: {
        pointer: true,
        styleCfg: { style: StyleBuilder.Row.builder().background('#eef') }, // custom hover bg
      },
      styleCfg: {
        style: row => this.isSubtotal(row)
          ? StyleBuilder.Row.builder().fontWeight(FontWeight.BOLD).background('#fafafa')
          : '',
        class: row => this.isSubtotal(row) ? 'subtotal not-hover' : null,
      },
    },
  };

  tableData: Customer[] = CustomerGenerator.generate(23);
}
