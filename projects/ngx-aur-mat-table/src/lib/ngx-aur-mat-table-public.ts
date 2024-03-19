import {NgxAurMatTableFilterable} from "./ngx-aur-mat-table-filterable";
import {NgxAurMatTableSelectionModel} from "./ngx-aur-mat-table-selection-model";
import {NgxAurMatTableRefreshable} from "./ngx-aur-mat-table-refreshable";

export interface NgxAurMatTablePublic<T> extends NgxAurMatTableFilterable<T>, NgxAurMatTableSelectionModel<T>, NgxAurMatTableRefreshable {

}
