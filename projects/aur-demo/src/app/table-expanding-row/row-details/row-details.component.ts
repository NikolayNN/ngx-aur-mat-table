import {Component, Input} from '@angular/core';
import {Customer} from "../../shared/model/customer";
import {TableRow} from "ngx-aur-mat-table";

@Component({
  selector: 'app-row-details',
  templateUrl: './row-details.component.html',
  styleUrls: ['./row-details.component.scss']
})
export class RowDetailsComponent {
  @Input() row: TableRow<Customer> | undefined;
}
