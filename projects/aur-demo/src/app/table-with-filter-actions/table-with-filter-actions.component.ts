import {Component, ViewChild} from '@angular/core';
import {TableConfig, TableRow} from "ngx-aur-mat-table";
import {PersonGenerator} from "../shared/generator/PersonGenerator";
import {Person} from "../shared/model/person";
import {Filters} from "../../../../ngx-aur-mat-table/src/lib/filter-action/NgxAurFilters";
import {MinMax} from "./filter-min-max/filter-min-max.component";
import {NgxAurMatTableFilterable} from "../../../../ngx-aur-mat-table/src/lib/ngx-aur-mat-table-filterable";

enum FilterName {
  BY_AGE = 'by-age',
  BY_FULL_NAME = 'by-full-name'
}

@Component({
  selector: 'app-table-with-filter-actions',
  templateUrl: './table-with-filter-actions.component.html',
  styleUrls: ['./table-with-filter-actions.component.scss']
})
export class TableWithFilterActionsComponent {

  // @ts-ignore
  @ViewChild("table") tableFilter: NgxAurMatTableFilterable;
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
  }

  filterByFullName($event: string) {
    this.tableFilter.applyFilter(FilterName.BY_FULL_NAME, new FilterActionsFullNameContainsString($event));
  }

  filterByAge($event: MinMax) {
    this.tableFilter.applyFilter(FilterName.BY_AGE, new FilterActionsAgeBetween($event.min, $event.max));
  }
}

class FilterActionsFullNameContainsString extends Filters.ContainsStringIgnoreCase<Person> {
  extractProperty(data: TableRow<Person>): string {
    return data.rowSrc.getFullName();
  }
}

class FilterActionsAgeBetween extends Filters.NumberRangeInclMinExclMax<Person> {
  extractProperty(data: TableRow<Person>): number {
    return data.rowSrc.age;
  }
}
