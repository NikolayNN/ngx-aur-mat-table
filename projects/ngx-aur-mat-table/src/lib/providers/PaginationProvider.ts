import {PaginationConfig, TableConfig} from "../model/ColumnConfig";
import {EmptyValue} from "../model/EmptyValue";
import {AbstractProvider} from "./AbstractProvider";

export class PaginationProvider extends AbstractProvider{
  public readonly isEnabled: boolean = true;
  public sizes: number[];
  public size;

  constructor(config: PaginationConfig) {
    super();
    this.sizes = config.sizes || [5, 10, 15, 25, 50]
    this.size = config.size || this.sizes[1];
  }

  public static canEnable<T>(tableConfig: TableConfig<T>): boolean {
    return (tableConfig.pageableCfg && tableConfig.pageableCfg.enable) || false;
  }

  public static create<T>(tableConfig: TableConfig<T>): PaginationProvider {
    if (this.canEnable(tableConfig) && tableConfig.pageableCfg) {
      return new PaginationProvider(tableConfig.pageableCfg)
    }
    return new PaginationProviderDummy()
  }

}

export class PaginationProviderDummy extends PaginationProvider {
  public override readonly isEnabled: boolean = false;

  constructor() {
    super(EmptyValue.PAGINATION_CONFIG);
  }
}
