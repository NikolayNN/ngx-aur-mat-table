import {AbstractProvider} from "./AbstractProvider";
import {AurDragDropManager, AurDragPreviewComponent} from "../drag-drop/aur-drag-drop.manager";
import {DragDropConfig, IconView, TableConfig} from "../model/ColumnConfig";
import {ViewContainerRef} from "@angular/core";

export class DragDropProvider<T> extends AbstractProvider {

  protected static readonly DEFAULT_ICON_VIEW: IconView<string> = {
    name: 'drag_handle'
  }

  public readonly isEnabled: boolean = true;
  public readonly COLUMN_NAME = 'tbl_drag_col';
  public readonly manager: AurDragDropManager;
  public readonly draggable: boolean = false;
  public readonly dragIconView: IconView<string> = DragDropProvider.DEFAULT_ICON_VIEW;
  public readonly previewConstructor: (new () => AurDragPreviewComponent<any>) | undefined;
  public readonly multiple: boolean = false;

  constructor(private readonly viewContainerRef: ViewContainerRef,
              private tableName: string,
              dragCfg?: DragDropConfig) {
    super();
    // здесь заполнить конфиг значениями по умолчанию если такие появятся
    this.manager = dragCfg?.manager ?? AurDragDropManager.empty();
    this.multiple = dragCfg?.multiple ?? false;
    this.draggable = (new Set(this.manager.draggableTableNames)).has(tableName);
    this.dragIconView = dragCfg?.dragIcon ?? DragDropProvider.DEFAULT_ICON_VIEW;
    this.previewConstructor = this.manager.getPreviewComponent(this.tableName);
  }

  public addColumn(columns: string[]): DragDropProvider<T> {
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
  public static create<T>(viewContainerRef: ViewContainerRef, tableConfig: TableConfig<T>): DragDropProvider<T> {
    if (DragDropProvider.canCreate(tableConfig)) {
      // @ts-ignore
      return new DragDropProvider(viewContainerRef, tableConfig.name ?? 'unknown-table', <DragDropConfig>tableConfig.dragCfg);
    }
    return new DragProviderDummy();
  }

  private static canCreate<T>(tableConfig: TableConfig<T>): boolean {
    return tableConfig?.dragCfg?.enable ?? false;
  }
}


export class DragProviderDummy extends DragDropProvider<any> {
  public override readonly isEnabled = false;

  constructor() {
    // @ts-ignore
    super(undefined, 'dummy-unknown-name');
  }

  public override addColumn(columns: string[]): DragProviderDummy {
    // No operation performed as the index is not enabled.
    return this;
  }
}
