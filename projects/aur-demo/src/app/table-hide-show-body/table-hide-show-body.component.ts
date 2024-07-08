import {Component} from '@angular/core';
import {NgxAurMatTableModule, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'app-table-hide-show-body',
  standalone: true,
  imports: [
    NgxAurMatTableModule,
    MatButton
  ],
  templateUrl: './table-hide-show-body.component.html',
  styleUrl: './table-hide-show-body.component.scss'
})
export class TableHideShowBodyComponent {

  isTableBodyHide = false;

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
    ]
  }
  tableData: Customer[] = CustomerGenerator.generate(10);

}
