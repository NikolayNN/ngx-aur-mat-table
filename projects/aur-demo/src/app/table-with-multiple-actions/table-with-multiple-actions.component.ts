import { Component } from '@angular/core';
import { ActionEvent, AUR_COLUMN, TableConfig } from 'ngx-aur-mat-table';
import { Customer } from '../shared/model/customer';
import { CustomerGenerator } from '../shared/generator/CustomerGenerator';

@Component({
  selector: 'app-table-with-multiple-actions',
  templateUrl: './table-with-multiple-actions.component.html',
  standalone: false,
})
export class TableWithMultipleActionsComponent {

  tableConfig: TableConfig<Customer> = {
    selectionCfg: { multiple: true },
    columnsCfg: [
      { name: 'Имя', key: 'name', valueConverter: v => v.name },
      { name: 'Возраст', key: 'age', valueConverter: v => v.age },
    ],
    actionCfg: [
      {
        key: 'primary-actions',
        position: 'start',
        actions: [
          { action: () => 'edit', icon: { name: () => 'edit', tooltip: () => 'редактировать', color: () => 'blue' } },
        ],
      },
      {
        key: 'row-tools',
        position: { after: 'age' },
        size: { fit: true },
        actions: [
          { action: () => 'copy', icon: { name: () => 'content_copy', tooltip: () => 'копировать' } },
        ],
      },
      {
        key: 'management-actions',
        position: { before: AUR_COLUMN.selection },
        actions: [
          {
            action: () => 'more',
            icon: { name: () => 'more_vert' },
            menu: [
              { action: () => 'archive', text: () => 'В архив', icon: { name: () => 'archive' } },
              { action: () => 'delete', text: () => 'Удалить', icon: { name: () => 'delete' } },
            ],
          },
        ],
      },
    ],
  };

  tableData: Customer[] = CustomerGenerator.generate(8);

  onRowAction($event: ActionEvent<Customer>) {
    alert($event.action + ': ' + $event.value.name);
  }
}
