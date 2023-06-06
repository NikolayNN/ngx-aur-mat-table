export class TableRow<T> {
  id: number;
  rowSrc: T;

  [key: string]: any;

  constructor(id: number, rowSrc: T) {
    this.rowSrc = rowSrc;
    this.id = id;
  }
}
