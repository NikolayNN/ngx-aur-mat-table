import {Action, ActionConfig, IconView, MenuItem} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";

export class ActionViewFactory {
  /**
   * Convert rows and actions to a view format.
   * @param rows - The data rows to be converted.
   * @param actionConfig - Configuration for actions on rows.
   * @return Map of row IDs to their associated action views.
   */
  public static create<T>(rows: TableRow<T>[], actionConfig: ActionConfig<T>): Map<number, Action<string>[]> {
    const result = new Map<number, Action<string>[]>();
    for (const row of rows) {
      result.set(row.id, this.prepareActionsForRow(row, actionConfig));
    }
    return result;
  }

  /**
   * Prepare the actions for a specific row based on the action configuration.
   * @param row - The data row for which actions need to be prepared.
   * @param actionConfig - Configuration for actions on rows.
   * @return Array of actions for the row.
   */
  private static prepareActionsForRow<T>(row: TableRow<T>, actionConfig: ActionConfig<T>): Action<string>[] {
    return actionConfig.actions.map(action => ({
      action: action.action(row.rowSrc),
      icon: this.prepareIconConfig(action.icon, row.rowSrc),
      visible: action.visible? action.visible(row.rowSrc): true,
      menu: action.menu? action.menu.map(item => this.prepareMenuItem(item, row.rowSrc)): undefined
    }));
  }

  private static prepareMenuItem<T>(item: MenuItem<(value: T) => string>, value: T): MenuItem<string> {
    return {
      action: item.action(value),
      text: item.text(value),
      icon: item.icon? this.prepareIconConfig(item.icon, value): undefined,
      visible: item.visible? item.visible(value): true,
      disabled: item.disabled? item.disabled(value): false
    };
  }

  private static prepareIconConfig<T>(iconSource: IconView<(value: T) => string>, value: T): IconView<string> {
    return {
      name: iconSource.name(value),
      color: iconSource.color ? iconSource.color(value) : undefined,
      tooltip: iconSource.tooltip ? iconSource.tooltip(value) : undefined,
      wrapper: iconSource.wrapper ? {color: iconSource.wrapper.color(value)} : undefined
    }
  }
}
