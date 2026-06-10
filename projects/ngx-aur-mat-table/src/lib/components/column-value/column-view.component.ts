import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {ColumnView} from "../../model/ColumnConfig";

@Component({
    selector: 'lib-column-view',
    templateUrl: './column-view.component.html',
    styleUrls: ['./column-view.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ColumnViewComponent {
  @Input() config: ColumnView<string> | undefined;
  @Input() value: any;
}
