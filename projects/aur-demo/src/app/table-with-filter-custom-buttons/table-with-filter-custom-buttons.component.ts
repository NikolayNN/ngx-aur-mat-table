import { Component } from '@angular/core';
import {MatButton} from "@angular/material/button";
import {NgxAurMatTableModule, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
  selector: 'app-table-with-filter-custom-buttons',
  standalone: true,
    imports: [
        MatButton,
        NgxAurMatTableModule
    ],
  templateUrl: './table-with-filter-custom-buttons.component.html',
  styleUrl: './table-with-filter-custom-buttons.component.scss'
})
export class TableWithFilterCustomButtonsComponent {
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
