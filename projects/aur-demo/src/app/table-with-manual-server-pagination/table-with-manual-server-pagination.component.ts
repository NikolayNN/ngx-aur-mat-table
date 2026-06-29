import { Component, OnInit } from '@angular/core';
import { PaginatorState, TableConfig } from 'ngx-aur-mat-table';
import { PageEvent } from '@angular/material/paginator';
import { Customer } from '../shared/model/customer';
import { CustomerService } from '../table-with-server-pagination-component/customer.service';

@Component({
  selector: 'app-table-with-manual-server-pagination',
  templateUrl: './table-with-manual-server-pagination.component.html',
  standalone: false,
})
export class TableWithManualServerPaginationComponent implements OnInit {
  private customerService = new CustomerService();

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'customers name', key: 'name', valueConverter: v => v.name },
      { name: 'customers age', key: 'age', valueConverter: v => v.age },
    ],
    paginationCfg: { enable: true, size: 20, sizes: [8, 15, 20, 25], mode: 'server' },
  };

  tableData: Customer[] = [];
  paginatorState = PaginatorState.empty();

  ngOnInit(): void {
    this.loadPage({ pageIndex: 0, pageSize: 20, previousPageIndex: 0, length: 0 });
  }

  loadPage(event: PageEvent): void {
    this.customerService.page(event.pageIndex, event.pageSize).subscribe(page => {
      this.tableData = page.content;
      this.paginatorState = PaginatorState.of({ total: page.totalElements, pageIndex: page.number });
    });
  }
}
