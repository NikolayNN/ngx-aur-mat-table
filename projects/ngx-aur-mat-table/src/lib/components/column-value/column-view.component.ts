import {Component, Input} from '@angular/core';
import {ColumnConfig} from "../../model/TableConfig";

@Component({
  selector: 'lib-column-view',
  templateUrl: './column-view.component.html',
  styleUrls: ['./column-view.component.css']
})
export class ColumnViewComponent {
  @Input() config: ColumnConfig<string> | undefined;
}
