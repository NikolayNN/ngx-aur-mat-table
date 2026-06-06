import { Component } from '@angular/core';
import { AurPageSource, TableConfig } from 'ngx-aur-mat-table';
import { Customer } from '../shared/model/customer';
import { CustomerGenerator } from '../shared/generator/CustomerGenerator';
import { CustomerService } from '../table-with-server-pagination-component/customer.service';

@Component({
  selector: 'app-table-pagination-matrix',
  templateUrl: './table-pagination-matrix.component.html',
  standalone: false,
})
export class TablePaginationMatrixComponent {
  private svc = new CustomerService();

  private columns = [
    { name: 'customers name', key: 'name', valueConverter: (v: Customer) => v.name },
    { name: 'customers age', key: 'age', valueConverter: (v: Customer) => v.age },
  ];

  // Full client-side data
  fullData: Customer[] = CustomerGenerator.generate(100);
  clientCfg: TableConfig<Customer> = { columnsCfg: this.columns, paginationCfg: { enable: true, size: 5 } };

  // Server-side data (pageSource owns the fetch loop)
  serverCfg: TableConfig<Customer> = { columnsCfg: this.columns, paginationCfg: { enable: true, size: 5, mode: 'server' } };
  loadPage: AurPageSource<Customer> = req => this.svc.page(req.pageIndex, req.pageSize);
}
