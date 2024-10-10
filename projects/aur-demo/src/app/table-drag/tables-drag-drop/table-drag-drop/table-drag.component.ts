import {Component, Input, OnInit} from '@angular/core';
import {TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../../../shared/model/customer";
import {CustomerGenerator} from "../../../shared/generator/CustomerGenerator";
import {AurDragDropManager} from "../../../../../../ngx-aur-mat-table/src/lib/drag-drop/aur-drag-drop.manager";

@Component({
  selector: 'app-table-drag',
  templateUrl: './table-drag.component.html',
  styleUrl: './table-drag.component.scss'
})
export class TableDragComponent implements OnInit {

  @Input() tableName = 'unknown-table-name';
  @Input() dragDropManager = AurDragDropManager.empty();
  // @ts-ignore
  tableConfig: TableConfig<Customer>;
  tableData: Customer[] = CustomerGenerator.generate(5);

  ngOnInit() {
    this.tableConfig = {
      name: this.tableName,
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
      dragCfg: {
        enable: true,
        multiple: true,
        manager: this.dragDropManager,
        dragIcon: {
          name: 'drag_handler',
          color: 'blue',
        }
      },
      selectionCfg: {
        enable: true,
        position: 'start',
        multiple: true
      }
    }
  }
}
