import {NgModule} from '@angular/core';
import {NgxAurMatTableComponent} from './ngx-aur-mat-table.component';
import {BrowserModule} from "@angular/platform-browser";
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
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";


@NgModule({
  declarations: [
    NgxAurMatTableComponent,
    DataPropertyGetterPipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
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
    DataPropertyGetterPipe
  ]
})
export class NgxAurMatTableModule {
}
