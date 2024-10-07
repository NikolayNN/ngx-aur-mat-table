import {AbstractProvider} from "./AbstractProvider";
import {AurDragDropManager} from "../drag-drop/aur-drag-drop.manager";
import {DragDropConfig, TableConfig} from "../model/ColumnConfig";

export class DragDropProvider extends AbstractProvider {
  public readonly isEnabled: boolean = true;
  public readonly COLUMN_NAME = 'tbl_drag_col';
  public readonly manager: AurDragDropManager;
  public readonly draggable: boolean = false;

  constructor(private tableName: string, private dragCfg?: DragDropConfig) {
    super();
    // здесь заполнить конфиг значениями по умолчанию если такие появятся
    this.manager = dragCfg?.manager ?? AurDragDropManager.empty();
    this.draggable = (new Set(this.manager.draggableTableNames)).has(tableName)
  }

  public addColumn(columns: string[]): DragDropProvider {
    if (this.notHasKey(this.COLUMN_NAME, columns) && this.draggable) {
      columns.unshift(this.COLUMN_NAME);
    }
    return this;
  }

  /**
   * Factory method to create an instance of IndexProvider based on table configuration.
   * Returns a dummy provider if the index is not enabled in the configuration.
   * @param tableConfig The configuration of the table.
   * @returns An instance of IndexProvider or IndexProviderDummy.
   */
  public static create<T>(tableConfig: TableConfig<T>): DragDropProvider {
    if (DragDropProvider.canCreate(tableConfig)) {
      return new DragDropProvider(tableConfig.name ?? 'unknown-table', <DragDropConfig>tableConfig.dragCfg);
    }
    return new DragProviderDummy();
  }

  private static canCreate<T>(tableConfig: TableConfig<T>): boolean {
    return tableConfig?.dragCfg?.enable ?? false;
  }
}


export class DragProviderDummy extends DragDropProvider {
  public override readonly isEnabled = false;

  constructor() {
    super('dummy-unknown-name');
  }

  public override addColumn(columns: string[]): DragProviderDummy {
    // No operation performed as the index is not enabled.
    return this;
  }
}
