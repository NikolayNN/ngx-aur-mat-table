import {PaginationConfig, TableConfig} from "../model/ColumnConfig";
import {EmptyValue} from "../model/EmptyValue";
import {AbstractProvider} from "./AbstractProvider";
import { isFeatureEnabled } from "../utils/feature-enabled.util";

export class PaginationProvider extends AbstractProvider {

  public readonly isEnabled: boolean = true;
  public sizes: number[];
  public size: number;
  public position: 'under' | 'bottom';

  constructor(config: PaginationConfig) {
    super();
    this.sizes = config.sizes || [5, 10, 15, 25, 50]
    this.size = config.size || this.sizes[1];
    this.position = config.position || 'bottom';
  }

  public static canEnable<T>(tableConfig: TableConfig<T>): boolean {
    return isFeatureEnabled(tableConfig.paginationCfg);
  }

  public static create<T>(tableConfig: TableConfig<T>): PaginationProvider {
    if (this.canEnable(tableConfig) && tableConfig.paginationCfg) {
      return new PaginationProvider(tableConfig.paginationCfg)
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
