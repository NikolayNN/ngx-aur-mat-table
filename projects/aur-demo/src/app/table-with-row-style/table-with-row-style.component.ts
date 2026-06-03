import { Component } from '@angular/core';
import { TableConfig, TableRow } from 'ngx-aur-mat-table';
import { Customer } from '../shared/model/customer';
import { CustomerGenerator } from '../shared/generator/CustomerGenerator';

@Component({
  selector: 'app-table-with-row-style',
  templateUrl: './table-with-row-style.component.html',
  styleUrls: ['./table-with-row-style.component.scss'],
  standalone: false,
})
export class TableWithRowStyleComponent {

  /** every 5th row is treated as a bold "subtotal" row */
  private isSubtotal = (row: TableRow<Customer>): boolean => row.id % 5 === 4;

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'name', key: 'name', valueConverter: v => v.name },
      { name: 'age', key: 'age', valueConverter: v => v.age },
    ],
    clickCfg: { pointer: true },
    rowStyleCfg: {
      // inline + typed: bold via the fontWeight field of DecorStyles — no stylesheet needed
      style: row => this.isSubtotal(row) ? { fontWeight: 'bold', background: '#fafafa' } : {},
      // class hook: CSS the consumer owns (see scss) — here it suppresses hover on subtotal rows
      class: row => this.isSubtotal(row) ? 'subtotal not-hover' : null,
    },
  };

  tableData: Customer[] = CustomerGenerator.generate(23);
}
