import {Component} from '@angular/core';
import {NgxAurMatTableModule, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
  selector: 'app-table-with-settings-button',
  standalone: true,
  imports: [
    NgxAurMatTableModule
  ],
  templateUrl: './table-with-settings-button.component.html',
  styleUrl: './table-with-settings-button.component.scss'
})
export class TableWithSettingsButtonComponent {

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
    tableHeaderButtonCfg: {
      enable: true,
      color: 'white',
      background: 'blue'
    }
  }

  tableData: Customer[] = CustomerGenerator.generate(10);
}
