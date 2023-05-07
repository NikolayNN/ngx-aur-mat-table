export class TableRow<T> {
  rowSrc: T;
  [key: string]: any;

  constructor(rowSrc: T) {
    this.rowSrc = rowSrc;
  }
}
