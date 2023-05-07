import {PaginationConfig} from "../model/ColumnConfig";

export class PaginationProvider {

  public sizes: number[];
  public size;

  constructor(config: PaginationConfig) {
    this.sizes = config.sizes || [5, 10, 15, 25, 50]
    this.size = config.size || this.sizes[1];
  }

}
