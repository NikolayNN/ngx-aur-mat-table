import {Component} from '@angular/core';
import {AurPageSource, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerService} from "./customer.service";

@Component({
    selector: 'app-table-with-server-pagination',
    templateUrl: './table-with-server-pagination.component.html',
    styleUrl: './table-with-server-pagination.component.scss',
    standalone: false
})
export class TableWithServerPaginationComponent {
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
    pageableCfg: {
      enable: true,
      size: 20,
      mode: 'server'
    }
  }

  loadPage: AurPageSource<Customer> = req =>
    this.customerService.page(req.pageIndex, req.pageSize);
}
