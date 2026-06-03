import { Subject, of, throwError } from 'rxjs';
import { AurPage, AurPageRequest } from '../model/AurPage';
import { ServerPageController, ServerPageResult } from './ServerPageController';

function makePage<T>(content: T[], totalElements: number, number?: number): AurPage<T> {
  return { content, totalElements, number };
}

describe('ServerPageController', () => {
  it('fires an initial request and maps the page to a result + state', () => {
    const requests: AurPageRequest[] = [];
    const results: ServerPageResult<number>[] = [];

    const controller = new ServerPageController<number>(
      req => { requests.push(req); return of(makePage([1, 2, 3], 30, req.pageIndex)); },
      {
        onResult: r => results.push(r),
        onLoading: () => {},
        onError: () => {},
      }
    );

    controller.start({ pageSize: 10 });

    expect(requests).toEqual([{ pageIndex: 0, pageSize: 10, sort: undefined }]);
    expect(results.length).toBe(1);
    expect(results[0].content).toEqual([1, 2, 3]);
    expect(results[0].state.length).toBe(30);
    expect(results[0].state.pageIndex).toBe(0);
  });

  it('uses request.pageIndex when page.number is omitted', () => {
    const results: ServerPageResult<number>[] = [];
    const controller = new ServerPageController<number>(
      req => of(makePage([], 5)), // no `number`
      { onResult: r => results.push(r), onLoading: () => {}, onError: () => {} }
    );
    controller.start({ pageIndex: 2, pageSize: 10 });
    expect(results[0].state.pageIndex).toBe(2);
  });

  it('seeds initial sort from start()', () => {
    const requests: AurPageRequest[] = [];
    const controller = new ServerPageController<number>(
      req => { requests.push(req); return of(makePage([], 0)); },
      { onResult: () => {}, onLoading: () => {}, onError: () => {} }
    );
    controller.start({ pageSize: 10, sort: { active: 'name', direction: 'asc' } });
    expect(requests[0].sort).toEqual({ active: 'name', direction: 'asc' });
  });
});

describe('ServerPageController events', () => {
  it('onPage builds a request with the new pageIndex/pageSize', () => {
    const requests: AurPageRequest[] = [];
    const c = new ServerPageController<number>(
      req => { requests.push(req); return of(makePage([], 0, req.pageIndex)); },
      { onResult: () => {}, onLoading: () => {}, onError: () => {} }
    );
    c.start({ pageSize: 10 });
    c.onPage({ pageIndex: 2, pageSize: 25 });
    expect(requests[1]).toEqual({ pageIndex: 2, pageSize: 25, sort: undefined });
  });

  it('onSort resets pageIndex to 0 and carries the sort', () => {
    const requests: AurPageRequest[] = [];
    const c = new ServerPageController<number>(
      req => { requests.push(req); return of(makePage([], 0, req.pageIndex)); },
      { onResult: () => {}, onLoading: () => {}, onError: () => {} }
    );
    c.start({ pageSize: 10 });
    c.onPage({ pageIndex: 3, pageSize: 10 });
    c.onSort({ active: 'name', direction: 'desc' });
    expect(requests[2]).toEqual({ pageIndex: 0, pageSize: 10, sort: { active: 'name', direction: 'desc' } });
  });

  it('reload() re-invokes with reset pageIndex by default, keeps it when resetPageIndex=false', () => {
    const requests: AurPageRequest[] = [];
    const c = new ServerPageController<number>(
      req => { requests.push(req); return of(makePage([], 0, req.pageIndex)); },
      { onResult: () => {}, onLoading: () => {}, onError: () => {} }
    );
    c.start({ pageSize: 10 });
    c.onPage({ pageIndex: 4, pageSize: 10 });
    c.reload();                              // default reset -> 0
    expect(requests[2].pageIndex).toBe(0);
    c.onPage({ pageIndex: 4, pageSize: 10 });
    c.reload({ resetPageIndex: false });     // keep current
    expect(requests[4].pageIndex).toBe(4);
  });

  it('toggles loading true then false around a request', () => {
    const log: boolean[] = [];
    const c = new ServerPageController<number>(
      () => of(makePage([], 0)),
      { onResult: () => {}, onLoading: v => log.push(v), onError: () => {} }
    );
    c.start({ pageSize: 10 });
    expect(log).toEqual([true, false]);
  });

  it('cancels a stale in-flight request (switchMap)', () => {
    const first = new Subject<AurPage<number>>();
    const second = new Subject<AurPage<number>>();
    let call = 0;
    const results: ServerPageResult<number>[] = [];
    const c = new ServerPageController<number>(
      () => (call++ === 0 ? first : second),
      { onResult: r => results.push(r), onLoading: () => {}, onError: () => {} }
    );
    c.start({ pageSize: 10 });   // subscribes to `first`
    c.onPage({ pageIndex: 1, pageSize: 10 }); // switches to `second`, cancels `first`
    first.next(makePage([99], 1)); // stale -> must be ignored
    second.next(makePage([7], 1, 1));
    expect(results.length).toBe(1);
    expect(results[0].content).toEqual([7]);
  });

  it('keeps the stream alive after an error', () => {
    const errors: unknown[] = [];
    const results: ServerPageResult<number>[] = [];
    let call = 0;
    const c = new ServerPageController<number>(
      req => {
        if (call++ === 0) { return throwError(() => new Error('boom')); }
        return of(makePage([1], 1, req.pageIndex));
      },
      { onResult: r => results.push(r), onLoading: () => {}, onError: e => errors.push(e) }
    );
    c.start({ pageSize: 10 });            // errors
    c.onPage({ pageIndex: 1, pageSize: 10 }); // still works
    expect(errors.length).toBe(1);
    expect(results.length).toBe(1);
  });

  it('stop() unsubscribes so later emits produce no results', () => {
    const results: ServerPageResult<number>[] = [];
    const c = new ServerPageController<number>(
      req => of(makePage([1], 1, req.pageIndex)),
      { onResult: r => results.push(r), onLoading: () => {}, onError: () => {} }
    );
    c.start({ pageSize: 10 });
    expect(results.length).toBe(1);
    c.stop();
    c.onPage({ pageIndex: 1, pageSize: 10 }); // after stop -> ignored
    expect(results.length).toBe(1);
  });

  it('does not emit loading=false when a request is cancelled (switchMap)', () => {
    const first = new Subject<AurPage<number>>();
    const second = new Subject<AurPage<number>>();
    let call = 0;
    const log: boolean[] = [];
    const c = new ServerPageController<number>(
      () => (call++ === 0 ? first : second),
      { onResult: () => {}, onLoading: v => log.push(v), onError: () => {} }
    );
    c.start({ pageSize: 10 });                 // loading true (first pending)
    c.onPage({ pageIndex: 1, pageSize: 10 });  // loading true again; first cancelled, NO false
    second.next(makePage([7], 1, 1));          // loading false once
    expect(log).toEqual([true, true, false]);
  });
});
