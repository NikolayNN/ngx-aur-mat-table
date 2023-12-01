import {ColumnView, IndexConfig, TableConfig} from "../model/ColumnConfig";

/**
 * Provides functionality to manage the index column in a table.
 * The class can handle index configurations and modify the column array to include an index column.
 */
export class IndexProvider {
  public isEnabled = true;
  public readonly COLUMN_NAME = 'tbl_index';
  public headerView: ColumnView<string> | undefined;
  public name: string;
  public offset: number;

  constructor(private indexConfig?: IndexConfig) {
    this.headerView = indexConfig?.headerColumn;
    this.name = indexConfig?.name || '';
    this.offset = indexConfig?.offset || 0;
  }

  /**
   * Adds the index column to the beginning of the columns array.
   * @param columns The array of column names to which the index column should be added.
   * @returns The instance of IndexProvider for method chaining.
   */
  public addIndexColumn(columns: string[]): IndexProvider {
    columns.unshift(this.COLUMN_NAME);
    return this;
  }

  /**
   * Factory method to create an instance of IndexProvider based on table configuration.
   * Returns a dummy provider if the index is not enabled in the configuration.
   * @param tableConfig The configuration of the table.
   * @returns An instance of IndexProvider or IndexProviderDummy.
   */
  public static create<T>(tableConfig: TableConfig<T>): IndexProvider {
    if (IndexProvider.canCreate(tableConfig)) {
      return new IndexProvider(<IndexConfig>tableConfig.indexCfg);
    }
    return new IndexProviderDummy();
  }

  private static canCreate<T>(tableConfig: TableConfig<T>): boolean {
    return (tableConfig.indexCfg && tableConfig.indexCfg.enable) || false;
  }
}


/**
 * A dummy implementation of IndexProvider that is used when index functionality is not enabled.
 * This class overrides certain methods to provide no-operation implementations.
 */
export class IndexProviderDummy extends IndexProvider {
  public override isEnabled = false;

  /**
   * Overrides the addIndexColumn method to return itself without modifying the columns array.
   * @param columns The array of column names.
   * @returns The instance of IndexProviderDummy for method chaining.
   */
  public override addIndexColumn(columns: string[]): IndexProviderDummy {
    // No operation performed as the index is not enabled.
    return this;
  }
}
