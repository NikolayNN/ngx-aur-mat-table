import {Component, OnInit} from '@angular/core';
import {NgxAurMatTableModule, PaginatorState, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerService} from "./customer.service";
import {PageEvent} from "@angular/material/paginator";
import {NgxAurTablePageEventUtils} from "../../../../ngx-aur-mat-table/src/lib/utils/ngx-aur-table-page-event.utils";

@Component({
  selector: 'app-table-with-server-pagination',
  templateUrl: './table-with-server-pagination.component.html',
  styleUrl: './table-with-server-pagination.component.scss'
})
export class TableWithServerPaginationComponent implements OnInit {
  private customerService = new CustomerService();

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

    pageableCfg: {
      enable: true,
      size: 20
    }
  }

  paginatorState = PaginatorState.empty();

  tableData: Customer[] = [];


  ngOnInit(): void {
    this.loadPage();
  }

  loadPage(pageEvent?: PageEvent) {
    if (!pageEvent) {
      pageEvent = NgxAurTablePageEventUtils.createEmpty(this.tableConfig);
    }

    this.customerService.page(pageEvent.pageIndex, pageEvent.pageSize).subscribe(page => {
      this.tableData = page.content;
      this.paginatorState = new PaginatorState(page.totalElements, page.number);
    })
  }
}
