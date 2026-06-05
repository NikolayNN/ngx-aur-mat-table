import {Component} from '@angular/core';
import {ActionEvent, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
    selector: 'app-table-with-menu',
    templateUrl: './table-with-menu.component.html',
    styleUrls: ['./table-with-menu.component.scss'],
    standalone: false
})
export class TableWithMenuComponent {

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

    actionCfg: {
      actions: [
        {
          action: () => 'menu',
          icon: {
            name: () => 'more_vert',
            tooltip: () => 'действия'
          },
          menu: [
            {
              action: () => 'view',
              text: () => 'Просмотр',
              icon: {name: () => 'visibility', color: () => 'blue'}
            },
            {
              action: () => 'archive',
              text: () => 'Архивировать',
              icon: {name: () => 'archive'},
              disabled: (c) => c.age < 18
            },
            {
              action: () => 'block',
              text: () => 'Заблокировать',
              icon: {name: () => 'block', color: () => 'orange'},
              visible: (c) => c.age >= 18
            },
            {
              action: () => 'delete',
              text: () => 'Удалить'
            }
          ]
        }
      ]
    }
  }

  tableData = CustomerGenerator.generate(10);

  onRowActions($event: ActionEvent<Customer>) {
    alert($event.action + ': ' + $event.value.name)
  }
}
