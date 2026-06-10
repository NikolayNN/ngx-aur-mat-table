import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import { IconView } from '../../model/ColumnConfig';


@Component({
    selector: 'lib-icon-view',
    templateUrl: './icon-view.component.html',
    styleUrl: './icon-view.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class IconViewComponent {

  @Input() view: IconView<string> | undefined;

}
