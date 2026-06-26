import {Component} from '@angular/core';
import {StyleBuilder, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
    selector: 'app-expanding-row',
    templateUrl: './expanding-row.component.html',
    styleUrls: ['./expanding-row.component.scss'],
    standalone: false
})
export class ExpandingRowComponent {

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
    indexCfg: {
      enable: true,
      offset: 1
    }
  }
  tableData: Customer[] = CustomerGenerator.generate(10);

  // --- controlled ---
  controlledConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'customers name', key: 'name', valueConverter: v => v.name },
      { name: 'customers age', key: 'age', valueConverter: v => v.age },
    ],
    extendedRowCfg: { mode: 'controlled' },
    indexCfg: { enable: true, offset: 1 },
  };
  controlledData: Customer[] = CustomerGenerator.generate(5);
  expandedCustomer: Customer | null = null;

  // --- multiple ---
  multipleConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'customers name', key: 'name', valueConverter: v => v.name },
      { name: 'customers age', key: 'age', valueConverter: v => v.age },
    ],
    extendedRowCfg: { multiple: true },
    indexCfg: { enable: true, offset: 1 },
  };
  multipleData: Customer[] = CustomerGenerator.generate(5);
  expandedCustomers: Customer[] = [];

}
