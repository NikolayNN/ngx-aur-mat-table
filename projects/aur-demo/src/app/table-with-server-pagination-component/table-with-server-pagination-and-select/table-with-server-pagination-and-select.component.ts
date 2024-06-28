import {Component} from '@angular/core';
import {CustomerService} from "../customer.service";
import {NgxAurTablePageEventUtils, PaginatorState, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../../shared/model/customer";
import {PageEvent} from "@angular/material/paginator";

@Component({
  selector: 'app-table-with-server-pagination-and-select',
  templateUrl: './table-with-server-pagination-and-select.component.html',
  styleUrl: './table-with-server-pagination-and-select.component.scss'
})
export class TableWithServerPaginationAndSelectComponent {
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
    selectionCfg: {
      enable: true,
      multiple: true,
      compareWith: (c1, c2) => c1.id === c2.id,
      showSelectedCount: true,
    },
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
      this.tableData = page.content
      this.paginatorState = new PaginatorState(page.totalElements, page.number);
    })
  }
}
