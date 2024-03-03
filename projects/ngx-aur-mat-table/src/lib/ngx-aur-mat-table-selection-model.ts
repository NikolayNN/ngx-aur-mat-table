import {SelectionModel} from "@angular/cdk/collections";

export interface NgxAurMatTableSelectionModel<T> {

  getSelectionModel(): SelectionModel<T>;
}
