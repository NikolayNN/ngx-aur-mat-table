import {Component} from '@angular/core';
import {TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";
import {Sort} from "@angular/material/sort";

@Component({
  selector: 'app-table-with-sort',
  templateUrl: './table-with-sort.component.html',
  styleUrls: ['./table-with-sort.component.scss']
})
export class TableWithSortComponent {

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      {
        name: 'customers name',
        key: 'name',
        valueConverter: v => v.name,
        sort: {
          enable: true,
          customSort: (data, key) => data.rowSrc.name.length
        }
      },
      {
        name: 'customers age',
        key: 'age',
        valueConverter: v => v.age,
        valueView: {
          icon: {
            name: v => {
              if (v.rowSrc.age < 30) {
                return 'local_florist'
              }
              if (v.rowSrc.age >= 30 && v.rowSrc.age < 40) {
                return 'favorite'
              }
              return 'local_shipping'
            }
          }
        },
        sort: {
          enable: true
        }
      }
    ]
  }
  tableData = CustomerGenerator.generate(10);

  onSort($event: Sort) {
    console.log($event)
  }

  updateTableData() {
    this.tableData = CustomerGenerator.generate(10);
  }
}
