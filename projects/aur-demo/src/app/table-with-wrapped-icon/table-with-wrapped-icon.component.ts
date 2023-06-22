import { Component, OnInit } from '@angular/core';
import {TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
  selector: 'app-table-with-wrapped-icon',
  templateUrl: './table-with-wrapped-icon.component.html',
  styleUrls: ['./table-with-wrapped-icon.component.scss']
})
export class TableWithWrappedIconComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      {
        name: 'customers name',
        key: 'name',
        valueConverter: v => v.name,
        headerView: {
          icon: {
            name: 'person',
            color: 'salmon'
          }
        },
      },
      {
        name: 'иконка',
        key: 'ext',
        valueConverter: v => '',
        valueView: {
          icon: {
            name: () => 'flight_takeoff',
            color: () => 'white',
            wrapper: {
              color: () => 'green'
            }
          },
          text: {
            show: false
          }
        }
      }
    ]
  }

  tableData = CustomerGenerator.generate(10);

}
