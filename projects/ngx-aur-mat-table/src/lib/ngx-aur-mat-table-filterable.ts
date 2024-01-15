import {Filters} from "./filter-action/Filters";

export interface NgxAurMatTableFilterable<T> {
  applyFilter(filterName: string, filter: Filters.Base<T>): void,
  removeFilter(filterName: string): void,
  clearFilters(): void
}
