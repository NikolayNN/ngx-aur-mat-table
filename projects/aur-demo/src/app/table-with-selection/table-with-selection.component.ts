import {Component} from '@angular/core';
import {TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
  selector: 'app-table-with-selection',
  templateUrl: './table-with-selection.component.html',
  styleUrls: ['./table-with-selection.component.scss']
})
export class TableWithSelectionComponent {

  selected: Customer[] = [];

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
      multiple: true
    }
  }
  tableData = CustomerGenerator.generate(10);

  onRefresh() {
    this.tableData = [...this.tableData]
  }
}
