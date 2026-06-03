import {Component} from '@angular/core';
import {TableConfig} from 'ngx-aur-mat-table';
import {Customer} from '../shared/model/customer';
import {CustomerGenerator} from '../shared/generator/CustomerGenerator';

@Component({
  selector: 'app-table-with-external-paginator',
  templateUrl: './table-with-external-paginator.component.html',
  standalone: false,
})
export class TableWithExternalPaginatorComponent {
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
      size: 20
    }
  };
  tableData: Customer[] = CustomerGenerator.generate(100);
}
