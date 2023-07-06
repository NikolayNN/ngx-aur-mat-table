import {Component} from '@angular/core';
import {ActionEvent, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
  selector: 'app-table-editable',
  templateUrl: './table-editable.component.html',
  styleUrls: ['./table-editable.component.scss']
})
export class TableEditableComponent {

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
    clickCfg: {
      pointer: true
    },
    actionCfg: {
      actions: [
        {
          icon: {
            name: 'edit'
          },
          action: 'edit'
        },
      ]
    }
  }
  tableData: Customer[] = CustomerGenerator.generate(10);

  onClick($event: Customer) {
    alert(JSON.stringify($event));
  }

  onAction($event: ActionEvent<Customer>) {
    $event.value.age = 5;
    this.tableData = this.tableData.map(c => c.name === $event.value.name ? $event.value : c);
  }
}
