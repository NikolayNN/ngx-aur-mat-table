import { Observable } from 'rxjs';
import { Sort } from '@angular/material/sort';

/** What the table asks for when it needs a page (server mode). */
export interface AurPageRequest {
  pageIndex: number;
  pageSize: number;
  sort?: Sort;
}

/**
 * A page of server data. Field names mirror Spring Data `Page<T>` so a backend
 * `Page<T>` is structurally assignable with no mapping. Only this subset is required;
 * extra `Page` fields (empty/first/last/totalPages/...) are allowed by structural typing.
 */
export interface AurPage<T> {
  content: T[];
  totalElements: number;
  number?: number; // page index; falls back to request.pageIndex when omitted
}

/** Host-supplied loader: given a request, return the matching page. */
export type AurPageSource<T> = (request: AurPageRequest) => Observable<AurPage<T>>;
