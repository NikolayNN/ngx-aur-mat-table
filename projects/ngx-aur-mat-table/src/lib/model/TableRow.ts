export class TableRow<T> {
  /** Page-local позиционный индекс строки 0..N-1 (служебный; наружу — только через контекст `index`). */
  rowId: number;
  rowSrc: T;

  [key: string]: any;

  constructor(rowId: number, rowSrc: T) {
    this.rowSrc = rowSrc;
    this.rowId = rowId;
  }
}
