import {Component, Input, OnInit} from '@angular/core';
import {ColumnView} from "../../model/ColumnConfig";

@Component({
  selector: 'lib-column-view',
  templateUrl: './column-view.component.html',
  styleUrls: ['./column-view.component.css']
})
export class ColumnViewComponent implements OnInit {
  @Input() config: ColumnView<string> | undefined;

  ngOnInit(): void {
    console.log(this.config);
  }

}
