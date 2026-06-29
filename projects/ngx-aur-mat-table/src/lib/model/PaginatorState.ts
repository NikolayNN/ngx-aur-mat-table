export class PaginatorState {

  private constructor(private _length: number, private _pageIndex: number) {
  }

  get length(): number {
    return this._length;
  }

  get pageIndex(): number {
    return this._pageIndex;
  }

  public static empty(): PaginatorState {
    return new PaginatorState(0, 0);
  }

  public static of(args: { total: number; pageIndex: number }): PaginatorState {
    return new PaginatorState(args.total, args.pageIndex);
  }
}
