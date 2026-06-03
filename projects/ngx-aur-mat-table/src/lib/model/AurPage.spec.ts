import { of } from 'rxjs';
import { AurPage, AurPageSource } from './AurPage';

// Mirrors the consuming app's Spring Data Page<T> (extra fields included on purpose).
class SpringPage<T> {
  empty = false;
  first = true;
  last = false;
  number = 0;
  numberOfElements = 0;
  totalElements = 0;
  totalPages = 0;
  content: T[] = [];
}

describe('AurPage contract', () => {
  it('accepts a Spring-Data-shaped Page<T> as AurPage<T> with no mapping', () => {
    const page = new SpringPage<{ id: number }>();
    page.content = [{ id: 1 }];
    page.totalElements = 1;

    const asAurPage: AurPage<{ id: number }> = page; // must compile (structural)
    expect(asAurPage.content.length).toBe(1);
    expect(asAurPage.totalElements).toBe(1);
    expect(asAurPage.number).toBe(0);
  });

  it('lets a service returning Observable<Page<T>> satisfy AurPageSource<T>', () => {
    const source: AurPageSource<{ id: number }> = req => {
      const page = new SpringPage<{ id: number }>();
      page.number = req.pageIndex;
      return of(page);
    };
    source({ pageIndex: 2, pageSize: 10 }).subscribe(p => expect(p.number).toBe(2));
  });
});
