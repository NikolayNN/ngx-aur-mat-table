import {Component, Input} from '@angular/core';
import {ColumnView} from "../../model/ColumnConfig";

@Component({
  selector: 'lib-column-view',
  templateUrl: './column-view.component.html',
  styleUrls: ['./column-view.component.css']
})
export class ColumnViewComponent {
  @Input() config: ColumnView<string> | undefined;
}
