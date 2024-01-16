import {Component, OnInit} from '@angular/core';
import {PersonGenerator} from "../shared/generator/PersonGenerator";
import {TableConfig} from "ngx-aur-mat-table";
import {Person} from "../shared/model/person";
import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";

@Component({
  selector: 'app-table-with-custom-columns',
  templateUrl: './table-with-custom-columns.component.html',
  styleUrls: ['./table-with-custom-columns.component.scss']
})
export class TableWithCustomColumnsComponent implements OnInit {

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
      }
    ],
    selectionCfg: {
      enable: true,
      multiple: true,
      showSelectedCount: true
    }
  }

  displayColumns: string[] = [];

  ngOnInit(): void {
    this.show = this.tableConfig.columnsCfg.map(cfg => cfg.key);
  }

  hide: string[] = [];

  show: string[] = [];

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex);
    }
    this.applyColumns()
  }

  applyColumns() {
    this.displayColumns = [...this.show];
  }
}
