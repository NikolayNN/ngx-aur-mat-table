import {NgModule} from '@angular/core';
import {NgxAurMatTableComponent} from './ngx-aur-mat-table.component';
import {MatIconModule} from "@angular/material/icon";
import {MatTableModule} from "@angular/material/table";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatButtonModule} from "@angular/material/button";
import {MatInputModule} from "@angular/material/input";
import {MatSortModule} from "@angular/material/sort";
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatFormFieldModule} from "@angular/material/form-field";
import {DataPropertyGetterPipe} from "./data-property-getter-pipe/data-property-getter.pipe";
import {ColumnViewComponent} from './components/column-value/column-view.component';
import {CommonModule} from "@angular/common";
import {NgxTableSubFooterRowDirective} from './directive/ngx-table-sub-footer-row.directive';
import {NgxAurTableSearchPrefixDirective} from "./directive/ngx-aur-table-search-prefix.directive";
import {NgxAurTableSearchSuffixDirective} from "./directive/ngx-aur-table-search-suffix.directive";
import {NgxAurCellDefDirective} from './directive/ngx-aur-cell-def.directive';
import {NgxAurExpandedRowDefDirective} from './directive/ngx-aur-expanded-row-def.directive';
import {NgxAurRowMarkerDefDirective} from './directive/ngx-aur-row-marker-def.directive';
import {NgxAurExtraHeaderTopDefDirective} from './directive/ngx-aur-extra-header-top-def.directive';
import {NgxAurExtraHeaderBottomDefDirective} from './directive/ngx-aur-extra-header-bottom-def.directive';
import {MatMenuModule} from "@angular/material/menu";
import {IconViewComponent} from "./components/icon-view/icon-view.component";


@NgModule({
  declarations: [
    NgxAurMatTableComponent,
    DataPropertyGetterPipe,
    ColumnViewComponent,
    IconViewComponent,
    NgxTableSubFooterRowDirective,
    NgxAurTableSearchPrefixDirective,
    NgxAurTableSearchSuffixDirective,
    NgxAurCellDefDirective,
    NgxAurExpandedRowDefDirective,
    NgxAurRowMarkerDefDirective,
    NgxAurExtraHeaderTopDefDirective,
    NgxAurExtraHeaderBottomDefDirective
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
    MatFormFieldModule,
    MatMenuModule,
  ],
  exports: [
    NgxAurMatTableComponent,
    DataPropertyGetterPipe,
    NgxTableSubFooterRowDirective,
    NgxAurTableSearchPrefixDirective,
    NgxAurTableSearchSuffixDirective,
    NgxAurCellDefDirective,
    NgxAurExpandedRowDefDirective,
    NgxAurRowMarkerDefDirective,
    NgxAurExtraHeaderTopDefDirective,
    NgxAurExtraHeaderBottomDefDirective
  ]
})
export class NgxAurMatTableModule {
}
