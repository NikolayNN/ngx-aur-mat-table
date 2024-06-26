import {HttpParams} from "@angular/common/http";

export class Page<T> {
  constructor(
    public content: T[],
    public totalElements: number,
    public totalPages: number,
    public number: number, // текущая страница
    public numberOfElements: number, // количество элементов на текущей странице
    public first: boolean,
    public last: boolean,
    public empty: boolean,
    public urlParams?: HttpParams
  ) {
  }
}
