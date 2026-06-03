import { PaginatorState } from '../ngx-aur-mat-table.component'; // via the re-export (public path)

describe('PaginatorState.of', () => {
  it('builds state from named args (length=total, pageIndex)', () => {
    const state = PaginatorState.of({ total: 100, pageIndex: 3 });
    expect(state.length).toBe(100);
    expect(state.pageIndex).toBe(3);
  });

  it('still supports the positional constructor (back-compat)', () => {
    const state = new PaginatorState(50, 1);
    expect(state.length).toBe(50);
    expect(state.pageIndex).toBe(1);
  });

  it('empty() yields zeros', () => {
    const state = PaginatorState.empty();
    expect(state.length).toBe(0);
    expect(state.pageIndex).toBe(0);
  });
});
