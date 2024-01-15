import {Filters} from "./filter-action/NgxAurFilters";

export interface NgxAurMatTableFilterable<T> {
  applyFilter(filterName: string, filter: Filters.Base<T>): void,
  removeFilter(filterName: string): void,
  clearFilters(): void
}
