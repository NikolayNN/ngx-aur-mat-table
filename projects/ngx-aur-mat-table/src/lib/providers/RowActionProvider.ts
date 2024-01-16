import {Action, ActionConfig, TableConfig} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";
import {ActionViewFactory} from "../factories/ActionViewFactory";
import {EmptyValue} from "../model/EmptyValue";
import {AbstractProvider} from "./AbstractProvider";

export interface ActionEvent<T> {
  action: string;
  value: T;
}

export class RowActionProvider<T> extends AbstractProvider {
  public static readonly COLUMN_NAME = 'tbl_actions';
  public readonly isEnabled: boolean = true;

  private readonly config: ActionConfig<T>;

  // key is rowId
  public actionView: Map<number, Action<string>[]> = new Map();

  constructor(tableConfig: TableConfig<T>) {
    super();
    if (!tableConfig.actionCfg) {
      throw new Error("Actions is undefined")
    }
    this.config = tableConfig.actionCfg;
  }

  get COLUMN_NAME() {
    return RowActionProvider.COLUMN_NAME;
  }

  public addActionColumn(columns: string[]): RowActionProvider<T> {
    if (!this.config || this.hasKey(this.COLUMN_NAME, columns)) {
      return this;
    }
    if (this.config.position === 'start') {
      columns.unshift(this.COLUMN_NAME);
    } else {
      columns.push(this.COLUMN_NAME);
    }
    return this;
  }

  /**
   * Convert rows and actions to a view format.
   * @param rows - The data rows to be converted.
   * @param actionConfig - Configuration for actions on rows.
   * @return Map of row IDs to their associated action views.
   */
  public setView(rows: TableRow<T>[]): RowActionProvider<T> {
    if (!this.config) {
      throw new Error("ActionConfig is undefined");
    }
    this.actionView = ActionViewFactory.create(rows, this.config);
    return this;
  }

  private static canEnabled<T>(tableConfig: TableConfig<T>): boolean {
    return (tableConfig.actionCfg && (tableConfig.actionCfg.enable === undefined || tableConfig.actionCfg.enable === null || tableConfig.actionCfg.enable)) || false
  }

  public static create<T>(tableConfig: TableConfig<T>): RowActionProvider<T> {
    if (RowActionProvider.canEnabled(tableConfig)) {
      return new RowActionProvider<T>(tableConfig);
    }
    return new RowActionProviderDummy<T>();
  }
}

export class RowActionProviderDummy<T> extends RowActionProvider<T> {
  public override readonly isEnabled = false;

  constructor() {
    super(EmptyValue.TABLE_CONFIG);
  }

  public override addActionColumn(columns: string[]): RowActionProviderDummy<T> {
    return this;
  }

  public override setView(rows: TableRow<T>[]): RowActionProvider<T> {
    return this;
  }
}
