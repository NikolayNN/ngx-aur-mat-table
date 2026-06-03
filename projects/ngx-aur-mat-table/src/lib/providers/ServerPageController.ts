import { Subject, Subscription, EMPTY } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Sort } from '@angular/material/sort';
import { AurPageRequest, AurPageSource } from '../model/AurPage';
import { PaginatorState } from '../model/PaginatorState';

export interface ServerPageResult<T> {
  content: T[];
  state: PaginatorState;
}

export interface ServerPageCallbacks<T> {
  onResult: (result: ServerPageResult<T>) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: unknown) => void;
}

export class ServerPageController<T> {

  private readonly request$ = new Subject<AurPageRequest>();
  private subscription?: Subscription;

  private pageIndex = 0;
  private pageSize = 0;
  private sort?: Sort;

  constructor(
    private readonly pageSource: AurPageSource<T>,
    private readonly callbacks: ServerPageCallbacks<T>
  ) {}

  start(initial: { pageIndex?: number; pageSize: number; sort?: Sort }): void {
    this.subscription?.unsubscribe();
    this.pageIndex = initial.pageIndex ?? 0;
    this.pageSize = initial.pageSize;
    this.sort = initial.sort;

    this.subscription = this.request$
      .pipe(
        tap(() => this.callbacks.onLoading(true)),
        switchMap(req =>
          this.pageSource(req).pipe(
            map(page => ({ req, page })),
            catchError(error => {
              this.callbacks.onLoading(false);
              this.callbacks.onError(error);
              return EMPTY;
            })
          )
        )
      )
      .subscribe(({ req, page }) => {
        this.callbacks.onLoading(false);
        this.callbacks.onResult({
          content: page.content,
          state: PaginatorState.of({
            total: page.totalElements,
            pageIndex: page.number ?? req.pageIndex,
          }),
        });
      });

    this.emit();
  }

  private emit(): void {
    this.request$.next({ pageIndex: this.pageIndex, pageSize: this.pageSize, sort: this.sort });
  }

  onPage(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.emit();
  }

  onSort(sort: Sort): void {
    this.sort = sort;
    this.pageIndex = 0;
    this.emit();
  }

  reload(opts?: { resetPageIndex?: boolean }): void {
    if (opts?.resetPageIndex !== false) {
      this.pageIndex = 0;
    }
    this.emit();
  }

  stop(): void {
    this.subscription?.unsubscribe();
  }
}
