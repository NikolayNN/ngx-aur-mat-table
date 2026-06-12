import { Observable } from 'rxjs';
import { Sort } from '@angular/material/sort';

/** Что запрашивает таблица, когда ей нужна страница (серверный режим). */
export interface AurPageRequest {
  pageIndex: number;
  pageSize: number;
  sort?: Sort;
}

/**
 * Страница серверных данных. Имена полей повторяют Spring Data `Page<T>`, поэтому серверный
 * `Page<T>` структурно совместим по присваиванию без маппинга. Требуется только это подмножество;
 * дополнительные поля `Page` (empty/first/last/totalPages/...) допускаются структурной типизацией.
 */
export interface AurPage<T> {
  content: T[];
  totalElements: number;
  number?: number; // индекс страницы; при отсутствии используется request.pageIndex
}

/** Данные применённой серверной страницы (pageSource-режим) — для счётчиков/графиков родителя. */
export interface AurPageLoadedEvent<T> {
  content: T[];
  totalElements: number;
  pageIndex: number;
}

/** Загрузчик, предоставляемый хостом: по запросу возвращает соответствующую страницу. */
export type AurPageSource<T> = (request: AurPageRequest) => Observable<AurPage<T>>;
