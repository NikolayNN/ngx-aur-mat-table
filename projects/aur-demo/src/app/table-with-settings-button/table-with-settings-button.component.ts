import {Component} from '@angular/core';
import {NgxAurMatTableModule, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'app-table-with-settings-button',
  standalone: true,
  imports: [
    NgxAurMatTableModule,
    MatButton
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
    },
    filterCfg: {
      enable: true
    }
  }

  tableData: Customer[] = CustomerGenerator.generate(10);
}
