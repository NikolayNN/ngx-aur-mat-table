import { Component, ViewChild } from '@angular/core';
import { map } from 'rxjs/operators';
import { NgxAurMatTableComponent, AurPageSource, TableConfig } from 'ngx-aur-mat-table';
import { Customer } from '../shared/model/customer';
import { CustomerService } from '../table-with-server-pagination-component/customer.service';

@Component({
  selector: 'app-table-with-server-filters',
  templateUrl: './table-with-server-filters.component.html',
  standalone: false,
})
export class TableWithServerFiltersComponent {
  private customerService = new CustomerService();

  @ViewChild('table') table!: NgxAurMatTableComponent<Customer>;

  showSpinner = false;
  nameFilter = '';

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'customers name', key: 'name', valueConverter: v => v.name },
      { name: 'customers age', key: 'age', valueConverter: v => v.age },
    ],
    pageableCfg: { enable: true, size: 20, mode: 'server' },
  };

  loadPage: AurPageSource<Customer> = req =>
    this.customerService.page(req.pageIndex, req.pageSize).pipe(
      map(page => ({
        content: page.content.filter(c => !this.nameFilter || c.name.includes(this.nameFilter)),
        totalElements: page.totalElements,
        number: page.number,
      }))
    );

  onNameFilterChange(value: string): void {
    this.nameFilter = value;
    this.table.reload();
  }
}
