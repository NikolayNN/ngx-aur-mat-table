import {Action, ActionConfig, IconView, MenuItem} from "../model/ColumnConfig";
import {TableRow} from "../model/TableRow";

export class ActionViewFactory {
  /**
   * Преобразует строки и действия в формат представления.
   * @param rows - Строки данных для преобразования.
   * @param actionConfig - Конфигурация действий над строками.
   * @return Map идентификаторов строк к связанным с ними представлениям действий.
   */
  public static create<T>(rows: TableRow<T>[], actionConfig: ActionConfig<T>): Map<number, Action<string>[]> {
    const result = new Map<number, Action<string>[]>();
    for (const row of rows) {
      result.set(row.id, this.prepareActionsForRow(row, actionConfig));
    }
    return result;
  }

  /**
   * Подготавливает действия для конкретной строки на основе конфигурации действий.
   * @param row - Строка данных, для которой нужно подготовить действия.
   * @param actionConfig - Конфигурация действий над строками.
   * @return Массив действий для строки.
   */
  private static prepareActionsForRow<T>(row: TableRow<T>, actionConfig: ActionConfig<T>): Action<string>[] {
    return actionConfig.actions.map(action => ({
      action: action.action(row.rowSrc),
      icon: this.prepareIconConfig(action.icon, row.rowSrc),
      visible: action.visible? action.visible(row.rowSrc): true,
      disabled: action.disabled? action.disabled(row.rowSrc): false,
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
      tooltipClass: iconSource.tooltipClass ? iconSource.tooltipClass(value) : undefined,
      tooltipPosition: iconSource.tooltipPosition,
      position: iconSource.position,
      wrapper: iconSource.wrapper ? {color: iconSource.wrapper.color(value)} : undefined
    }
  }
}
