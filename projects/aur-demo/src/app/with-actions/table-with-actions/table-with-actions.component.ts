import {Component} from '@angular/core';
import {ActionEvent, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../../shared/model/customer";
import {CustomerGenerator} from "../../shared/generator/CustomerGenerator";

@Component({
  selector: 'app-table-with-actions',
  templateUrl: './table-with-actions.component.html',
  styleUrls: ['./table-with-actions.component.scss']
})
export class TableWithActionsComponent {

  tableConfig: TableConfig<Customer> = {
    columnsCfg:  [
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

    actionCfg: {
      actions: [
        {
          action: () =>'edit',
          icon: {
            name: () => 'edit',
            tooltip: () => 'редактировать',
            color: () => 'blue'
          }
        },
        {
          action: () => 'delete',
          icon: {
            name: () => 'delete',
            tooltip:  () => 'удалить',
            color: () => 'red'
          }
        }
      ]
    }
  }

  tableData = CustomerGenerator.generate(10);

  onRowActions($event: ActionEvent<Customer>) {
    alert($event.action + ': ' + $event.value.name)
  }
}
