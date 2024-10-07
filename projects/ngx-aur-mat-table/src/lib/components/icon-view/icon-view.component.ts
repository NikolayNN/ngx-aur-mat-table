import {Component, Input} from '@angular/core';
import {IconView} from "ngx-aur-mat-table";

@Component({
  selector: 'lib-icon-view',
  templateUrl: './icon-view.component.html',
  styleUrl: './icon-view.component.css'
})
export class IconViewComponent {

  @Input() view: IconView<string> | undefined;

}
