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
import {TableCustomHeaderComponent} from './table-custom-header/table-custom-header.component';
import {
  TableWithPaginationAndCheckboxesComponent
} from './table-with-pagination-and-checkboxes/table-with-pagination-and-checkboxes.component';
import {TableWithTotalComponent} from './table-with-total/table-with-total.component';
import {TableWithFilterActionsComponent} from './table-with-filter-actions/table-with-filter-actions.component';
import { FilterStringComponent } from './table-with-filter-actions/filter-action-string-contains/filter-string.component';
import {FormsModule} from "@angular/forms";
import {MatInputModule} from "@angular/material/input";
import { FilterMinMaxComponent } from './table-with-filter-actions/filter-min-max/filter-min-max.component';
import { TableWithCustomColumnsComponent } from './table-with-custom-columns/table-with-custom-columns.component';
import {DragDropModule} from "@angular/cdk/drag-drop";
import { ExpandingRowComponent } from './table-expanding-row/expanding-row.component';
import { RowDetailsComponent } from './table-expanding-row/row-details/row-details.component';
import { TableWithSubFooterComponent } from './table-with-sub-footer/table-with-sub-footer.component';
import {TableWithSettingsButtonComponent} from "./table-with-settings-button/table-with-settings-button.component";
import {
  TableWithFilterCustomButtonsComponent
} from "./table-with-filter-custom-buttons/table-with-filter-custom-buttons.component";
import {
  TableWithServerPaginationComponent
} from "./table-with-server-pagination-component/table-with-server-pagination.component";
import {
  TableWithServerPaginationAndSelectComponent
} from "./table-with-server-pagination-component/table-with-server-pagination-and-select/table-with-server-pagination-and-select.component";

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
    TableWithTotalComponent,
    TableWithFilterActionsComponent,
    FilterStringComponent,
    FilterMinMaxComponent,
    TableWithCustomColumnsComponent,
    ExpandingRowComponent,
    RowDetailsComponent,
    TableWithSubFooterComponent,
    TableWithServerPaginationComponent,
    TableWithServerPaginationAndSelectComponent
  ],
  imports: [
    BrowserModule,
    NgxAurMatTableModule,
    BrowserAnimationsModule,
    MatTabsModule,
    MatChipsModule,
    FormsModule,
    MatInputModule,
    DragDropModule,
    TableWithSettingsButtonComponent,
    TableWithFilterCustomButtonsComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
