import {Component} from '@angular/core';
import {TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
  selector: 'app-table-with-sticky-header',
  templateUrl: './table-with-sticky-header.component.html',
  styleUrls: ['./table-with-sticky-header.component.scss']
})
export class TableWithStickyHeaderComponent {

  tableData: Customer[] = CustomerGenerator.generate(20);

  tableConfigPaginatorUnder: TableConfig<Customer> = {
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
      },
    ],
    pageableCfg: {
      enable: true,
      style: 'background-color: gray',
      position: 'under'
    },
    stickyCfg: {
      header: true,
    }
  }

  tableConfigPaginatorBottom: TableConfig<Customer> = {
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
      },
    ],
    pageableCfg: {
      enable: true,
      style: 'background-color: gray',
      position: 'bottom'
    },
    stickyCfg: {
      header: true,
    }
  }

}
