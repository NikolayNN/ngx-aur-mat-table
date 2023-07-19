import { Component } from '@angular/core';
import { ColumnOffset, TableConfig } from "ngx-aur-mat-table";
import { CustomerGenerator } from "../shared/generator/CustomerGenerator";
import { Customer } from "../shared/model/customer";

@Component({
  selector: 'app-table-custom-header',
  templateUrl: './table-custom-header.component.html',
  styleUrls: ['./table-custom-header.component.scss']
})
export class TableCustomHeaderComponent {

  public columnOffsetList: ColumnOffset[] = [];

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


  changeColumnOffsets($event: ColumnOffset[]) {
    setTimeout(() => this.columnOffsetList = $event, 0);
  }
}
