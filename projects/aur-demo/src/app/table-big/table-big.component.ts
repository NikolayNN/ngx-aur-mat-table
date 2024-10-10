import {Component, OnInit} from '@angular/core';
import {PersonGenerator} from "../shared/generator/PersonGenerator";
import {ActionEvent, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {Person} from "../shared/model/person";

@Component({
  selector: 'app-table-big',
  templateUrl: './table-big.component.html',
  styleUrls: ['./table-big.component.scss']
})
export class TableBigComponent {
  tableData = PersonGenerator.generate(20);

  tableConfig: TableConfig<Person> = {
    columnsCfg: [
      {
        name: 'Имя',
        key: 'first_name',
        valueConverter: v => v.firstName,
        sort: {
          enable: true
        }
      },
      {
        name: 'Фамилия',
        key: 'last_name',
        valueConverter: v => v.lastName,
        valueView: {
          icon: {
            name: () => 'account_circle',
            color: () => 'green',
            tooltip: v => v.rowSrc.getFullName()
          }
        },
        sort: {
          enable: true
        }
      },
      {
        name: 'Возраст',
        key: 'age',
        valueConverter: v => v.age,
        sort: {
          enable: true
        }
      },
      {
        name: 'Пол',
        key: 'gender',
        valueConverter: v => v.gender
      },
      {
        name: 'адрес',
        key: 'address',
        valueConverter: v => v.getAddress()
      },
      {
        name: 'эл. почта',
        key: 'email',
        valueConverter: v => v.email,
        headerView: {
          icon: {
            name: 'email'
          }
        }
      },
      {
        name: 'телефон',
        key: 'phone_number',
        valueConverter: v => v.phoneNumber
      },
      {
        name: 'Гражданство',
        key: 'occupation',
        valueConverter: v => v.occupation,
        headerView: {
          icon: {
            name: 'work',
            tooltip: 'Рабочая специальность'
          },
          text: {
            show: false,
          }
        }
      }
    ],
    stickyCfg: {
      header: true
    },
    clickCfg: {
      pointer: true
    },
    filterCfg: {
      enable: false
    },
    selectionCfg: {
      enable: true,
      position: "start"
    },
    indexCfg: {
      enable: true,
      offset: 1
    },
    actionCfg: {
      actions: [
        {
          action: () => 'history',
          icon: {
            name: () => 'history',
            color: () => 'blue',
            tooltip: () => 'История посещений'
          }
        },
        {
          action: () => 'delete',
          icon: {
            name: () => 'delete',
            color: () => 'red',
            tooltip: () => 'Удалить пользователя'
          }
        }
      ]
    }
  }

  onClick($event: Person) {
    alert("clicked on row: " + JSON.stringify($event));
  }

  onAction($event: ActionEvent<Person>) {
    alert("clicked on action: " + JSON.stringify($event));
  }
}
