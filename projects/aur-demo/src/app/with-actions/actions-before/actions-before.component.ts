import {Component} from '@angular/core';
import {ActionEvent, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../../shared/model/customer";
import {CustomerGenerator} from "../../shared/generator/CustomerGenerator";

@Component({
  selector: 'app-actions-before',
  templateUrl: './actions-before.component.html',
  styleUrls: ['./actions-before.component.scss']
})
export class ActionsBeforeComponent {

  tableConfig: TableConfig<Customer> ={
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
      position: 'start',
      actions: [
        {
          action: 'edit',
          icon: {
            name: 'edit',
            tooltip: 'редактировать',
            color: 'blue'
          }
        },
        {
          action: 'delete',
          icon: {
            name: 'delete',
            tooltip: 'удалить',
            color: 'red'
          }
        }
      ]
    }
  }

  tableData: Customer[] = CustomerGenerator.generate(10);

  onRowActions($event: ActionEvent<Customer>) {
    alert($event.action + ': ' + $event.value.name)
  }

}
