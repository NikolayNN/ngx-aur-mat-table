import {NgModule} from '@angular/core';
import {NgxAurMatTableComponent} from './ngx-aur-mat-table.component';
import {MatIconModule} from "@angular/material/icon";
import {MatLegacyTableModule as MatTableModule} from "@angular/material/legacy-table";
import {MatLegacyPaginatorModule as MatPaginatorModule} from "@angular/material/legacy-paginator";
import {MatLegacyButtonModule as MatButtonModule} from "@angular/material/legacy-button";
import {MatLegacyInputModule as MatInputModule} from "@angular/material/legacy-input";
import {MatSortModule} from "@angular/material/sort";
import {MatLegacyTooltipModule as MatTooltipModule} from "@angular/material/legacy-tooltip";
import {MatLegacyCheckboxModule as MatCheckboxModule} from "@angular/material/legacy-checkbox";
import {MatLegacyFormFieldModule as MatFormFieldModule} from "@angular/material/legacy-form-field";
import {DataPropertyGetterPipe} from "./data-property-getter-pipe/data-property-getter.pipe";
import {ColumnViewComponent} from './components/column-value/column-view.component';
import {CommonModule} from "@angular/common";
import { NgxTableSubFooterRowDirective } from './directive/ngx-table-sub-footer-row.directive';


@NgModule({
  declarations: [
    NgxAurMatTableComponent,
    DataPropertyGetterPipe,
    ColumnViewComponent,
    NgxTableSubFooterRowDirective
  ],
  imports: [
    CommonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatInputModule,
    MatSortModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatFormFieldModule
  ],
  exports: [
    NgxAurMatTableComponent,
    DataPropertyGetterPipe,
    NgxTableSubFooterRowDirective
  ]
})
export class NgxAurMatTableModule {
}
