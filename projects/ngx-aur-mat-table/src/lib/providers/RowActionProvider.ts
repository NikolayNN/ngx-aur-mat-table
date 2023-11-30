import {Action, ActionConfig, IconView} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";

export interface ActionEvent<T> {
  action: string;
  value: T;
}

export class RowActionProvider {

  readonly COLUMN_NAME = 'tbl_actions';

  constructor(ctx: ActionConfig<any>, columns: string[]) {
    if (ctx.position === 'start') {
      columns.unshift(this.COLUMN_NAME);
    } else {
      columns.push(this.COLUMN_NAME);
    }
  }

  /**
   * Convert rows and actions to a view format.
   * @param rows - The data rows to be converted.
   * @param actionConfig - Configuration for actions on rows.
   * @return Map of row IDs to their associated action views.
   */
  public toView<T>(rows: TableRow<T>[], actionConfig: ActionConfig<T>): Map<number, Action<string>[]> {
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
  private prepareActionsForRow<T>(row: TableRow<T>, actionConfig: ActionConfig<T>): Action<string>[] {
    return actionConfig.actions.map(action => ({
      action: action.action(row.rowSrc),
      icon: this.prepareIconConfig(action.icon, row.rowSrc)
    }));
  }

  private prepareIconConfig<T>(iconSource: IconView<(value: T) => string>, value: T): IconView<string> {
    return {
      name: iconSource.name(value),
      color: iconSource.color ? iconSource.color(value) : undefined,
      tooltip: iconSource.tooltip ? iconSource.tooltip(value) : undefined,
      position: iconSource.position,
      wrapper: iconSource.wrapper? {color: iconSource.wrapper.color(value)}: undefined
    }
  }
}
