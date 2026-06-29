import {Component} from '@angular/core';
import {ActionEvent, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../../shared/model/customer";

@Component({
    selector: 'app-table-with-actions',
    templateUrl: './table-with-actions.component.html',
    styleUrls: ['./table-with-actions.component.scss'],
    standalone: false
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
        // Состояние-зависимое действие: action/icon.name/color/tooltip считаются от строки.
        // Демонстрирует фикс #1/#3 — после «Переключить возраст» ([tableData] = новый массив)
        // иконка/цвет/код перещёлкиваются (раньше залипали).
        {
          action: c => (c.age >= 18 ? 'set-minor' : 'set-adult'),
          icon: {
            name: c => (c.age >= 18 ? 'verified_user' : 'child_care'),
            color: c => (c.age >= 18 ? 'green' : 'gray'),
            tooltip: c => (c.age >= 18 ? 'совершеннолетний' : 'несовершеннолетний')
          }
        },
        {
          action: () =>'edit',
          icon: {
            name: () => 'edit',
            tooltip: () => 'редактировать',
            color: () => 'blue'
          }
        },
        // disabled для несовершеннолетних, цвет красный. Демонстрирует фикс #2:
        // у disabled-кнопки красный гаснет в нейтральный disabled-цвет (раньше оставался красным).
        {
          action: () => 'delete',
          icon: {
            name: () => 'delete',
            tooltip:  () => 'удалить',
            color: () => 'red'
          },
          disabled: c => c.age < 18
        },
        {
          action: () => 'more',
          icon: {
            name: () => 'more_vert',
            tooltip: () => 'ещё'
          },
          menu: [
            {
              action: () => 'duplicate',
              text: () => 'Дублировать',
              icon: {name: () => 'content_copy', color: () => 'green'}
            },
            // disabled пункт меню с цветом — фикс #2 распространяется и на пункты меню.
            {
              action: () => 'archive',
              text: () => 'В архив',
              icon: {name: () => 'archive', color: () => 'purple'},
              disabled: (c) => c.age < 18
            },
            {
              action: () => 'block',
              text: () => 'Заблокировать',
              visible: (c) => c.age >= 18
            }
          ]
        }
      ]
    }
  }

  // Смешанные возрасты: совершеннолетние (delete красный, статус verified_user/зелёный)
  // и несовершеннолетние (delete нейтральный disabled, статус child_care/серый) — видно сразу.
  tableData: Customer[] = [
    {id: 0, name: 'Alice',   age: 30},
    {id: 1, name: 'Bob',     age: 15},
    {id: 2, name: 'Charlie', age: 42},
    {id: 3, name: 'Diana',   age: 16},
    {id: 4, name: 'Eve',     age: 25},
  ];

  /** Переключает каждого между совершеннолетним и несовершеннолетним: НОВЫЙ массив
   *  НОВЫХ объектов (как ответ REST). Action-иконки, цвет, tooltip и disabled-состояние
   *  должны пересчитаться по новым данным. */
  toggleAges() {
    this.tableData = this.tableData.map(c => ({...c, age: c.age >= 18 ? 10 : 30}));
  }

  onRowActions($event: ActionEvent<Customer>) {
    alert($event.action + ': ' + $event.value.name)
  }
}
