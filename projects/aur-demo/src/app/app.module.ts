import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {TableWithIconsComponent} from './table-with-icons/table-with-icons.component';
import {ComplexObjectComponent} from './complex-object/complex-object.component';

import {SimpleTableComponent} from "./simple-table/simple-table.component";
import {TableWithActionsComponent} from './with-actions/table-with-actions/table-with-actions.component';
import {MatTabsModule} from "@angular/material/tabs";
import {ActionsBeforeComponent} from './with-actions/actions-before/actions-before.component';
import {TableWithPaginationComponent} from './table-with-pagination/table-with-pagination.component';
import {TableWithSelectionComponent} from './table-with-selection/table-with-selection.component';
import {TableWithSortComponent} from './table-with-sort/table-with-sort.component';
import {TableWithIndexComponent} from './table-with-index/table-with-index.component';
import {TableBigComponent} from './table-big/table-big.component';
import {TableEmptyComponent} from './table-empty/table-empty.component';
import {TableWithStickyHeaderComponent} from './table-with-sticky-header/table-with-sticky-header.component';
import {TableEditableComponent} from './table-editable/table-editable.component';
import {TableHighlightClickedRowComponent} from './table-highlight-clicked-row/table-highlight-clicked-row.component';
import {TableWithWrappedIconComponent} from './table-with-wrapped-icon/table-with-wrapped-icon.component';
import {NgxAurMatTableModule} from "../../../ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module";
import {MatChipsModule} from "@angular/material/chips";
import { TableCustomHeaderComponent } from './table-custom-header/table-custom-header.component';
import { TableWithPaginationAndCheckboxesComponent } from './table-with-pagination-and-checkboxes/table-with-pagination-and-checkboxes.component';
import { TableWithTotalComponent } from './table-with-total/table-with-total.component';

@NgModule({
  declarations: [
    AppComponent,
    SimpleTableComponent,
    TableWithIconsComponent,
    ComplexObjectComponent,
    TableWithActionsComponent,
    ActionsBeforeComponent,
    TableWithPaginationComponent,
    TableWithSelectionComponent,
    TableWithSortComponent,
    TableWithIndexComponent,
    TableBigComponent,
    TableEmptyComponent,
    TableWithStickyHeaderComponent,
    TableEditableComponent,
    TableHighlightClickedRowComponent,
    TableWithWrappedIconComponent,
    TableCustomHeaderComponent,
    TableWithPaginationAndCheckboxesComponent,
    TableWithTotalComponent
  ],
  imports: [
    BrowserModule,
    NgxAurMatTableModule,
    BrowserAnimationsModule,
    MatTabsModule,
    MatChipsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
