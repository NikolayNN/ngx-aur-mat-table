import {NgxAurFilters} from "./filters/NgxAurFilters";

export interface NgxAurMatTableFilterable<T> {
  applyFilter(filterName: string, filter: NgxAurFilters.Base<T>): void,
  removeFilter(filterName: string): void,
  clearFilters(): void
}
