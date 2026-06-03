import {Component} from '@angular/core';
import {CustomerService} from "../customer.service";
import {AurPageSource, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../../shared/model/customer";

@Component({
    selector: 'app-table-with-server-pagination-and-select',
    templateUrl: './table-with-server-pagination-and-select.component.html',
    styleUrl: './table-with-server-pagination-and-select.component.scss',
    standalone: false
})
export class TableWithServerPaginationAndSelectComponent {
  private customerService = new CustomerService();

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
    selectionCfg: {
      enable: true,
      multiple: true,
      compareWith: (c1, c2) => c1.id === c2.id,
      showSelectedCount: true,
    },
    pageableCfg: {
      enable: true,
      size: 20,
      mode: 'server'
    }
  }

  loadPage: AurPageSource<Customer> = req =>
    this.customerService.page(req.pageIndex, req.pageSize);
}
