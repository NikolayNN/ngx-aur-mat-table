import { Action, ActionColumnPosition, ActionConfig, AUR_COLUMN, ColumnSize, DEFAULT_ACTION_COLUMN, TableConfig } from "../model/ColumnConfig";
import { TableRow } from "../model/TableRow";
import { ActionViewFactory } from "../factories/ActionViewFactory";
import { EmptyValue } from "../model/EmptyValue";
import { AbstractProvider } from "./AbstractProvider";
import { NgxAurTableConfigUtil } from "../utils/ngx-aur-table-config.util";
import { isDevMode } from "@angular/core";

export interface ActionEvent<T> {
  action: string;
  value: T;
}

/** Разрешённое представление одной колонки действий (одна на каждый ActionConfig). */
export interface ActionColumnView<T> {
  /** Имя matColumnDef (= key или 'tbl_actions'). */
  columnName: string;
  size?: ColumnSize;
  position: ActionColumnPosition;
  /** ключ — rowId; значение — разрешённые действия строки. */
  actionView: Map<number, Action<string>[]>;
}

export class RowActionProvider<T> extends AbstractProvider {
  public static readonly COLUMN_NAME = DEFAULT_ACTION_COLUMN;
  public readonly isEnabled: boolean = true;

  /** По одному элементу на каждую валидную action-колонку. Пусто → колонок нет. */
  public columns: ActionColumnView<T>[] = [];

  /** Нормализованные конфиги, выровнены 1:1 с columns. */
  protected readonly configs: ActionConfig<T>[];

  constructor(tableConfig: TableConfig<T>) {
    super();
    this.configs = this.resolveConfigs(tableConfig);
    this.columns = this.configs.map(cfg => ({
      columnName: NgxAurTableConfigUtil.actionColumnName(cfg),
      size: cfg.size,
      position: cfg.position ?? 'end',
      actionView: new Map<number, Action<string>[]>(),
    }));
  }

  /** Нормализация + отбрасывание дублей/коллизий ключей (dev-warn). Возвращает выровненный с columns список. */
  private resolveConfigs(tableConfig: TableConfig<T>): ActionConfig<T>[] {
    const reserved = new Set<string>([
      ...tableConfig.columnsCfg.map(c => c.key),
      AUR_COLUMN.selection, AUR_COLUMN.index, AUR_COLUMN.drag, AUR_COLUMN.timeline,
    ]);
    const taken = new Set<string>();
    const kept: ActionConfig<T>[] = [];
    for (const cfg of NgxAurTableConfigUtil.actionConfigs(tableConfig)) {
      const name = NgxAurTableConfigUtil.actionColumnName(cfg);
      if (taken.has(name) || reserved.has(name)) {
        if (isDevMode()) {
          console.warn(`[aur-mat-table] action key "${name}" дублируется или конфликтует с другой колонкой — колонка пропущена.`);
        }
        continue;
      }
      taken.add(name);
      kept.push(cfg);
    }
    return kept;
  }

  /** Фаза 1: вставка колонок со строковым position ('start'/'end'). */
  public addActionColumns(columns: string[]): RowActionProvider<T> {
    const startNames: string[] = [];
    for (const col of this.columns) {
      if (this.hasKey(col.columnName, columns)) continue;   // вписан в [displayColumns]
      if (col.position === 'start') {
        startNames.push(col.columnName);
      } else if (col.position === 'end') {
        columns.push(col.columnName);
      }
      // объектные (anchor) позиции — фаза 2 (applyAnchors), см. Task 3
    }
    if (startNames.length) columns.unshift(...startNames);
    return this;
  }

  /** Фаза 2: вставка колонок с ЯКОРНЫМ position ({before}/{after}); итеративно для цепочек. */
  public applyAnchors(columns: string[]): RowActionProvider<T> {
    const pending = this.columns.filter(c =>
      typeof c.position === 'object' && !this.hasKey(c.columnName, columns));

    let progress = true;
    while (pending.length && progress) {
      progress = false;
      for (let i = pending.length - 1; i >= 0; i--) {
        const col = pending[i];
        const pos = col.position as { before?: string; after?: string };
        const anchor = pos.before ?? pos.after!;
        const idx = columns.indexOf(anchor);
        if (idx === -1) continue;                       // якорь ещё не на месте — позже
        const at = pos.before !== undefined ? idx : idx + 1;
        columns.splice(at, 0, col.columnName);
        pending.splice(i, 1);
        progress = true;
      }
    }

    // неразрешённые (якорь не найден/выключен) — в конец + dev-warn
    for (const col of pending) {
      columns.push(col.columnName);
      if (isDevMode()) {
        const pos = col.position as { before?: string; after?: string };
        console.warn(`[aur-mat-table] action-колонка "${col.columnName}": якорь "${pos.before ?? pos.after}" не найден — колонка добавлена в конец.`);
      }
    }
    return this;
  }

  /** Строит actionView для КАЖДОЙ колонки (ActionViewFactory переиспользуется per-config). */
  public setView(rows: TableRow<T>[]): RowActionProvider<T> {
    this.columns.forEach((col, i) => {
      col.actionView = ActionViewFactory.create(rows, this.configs[i]);
    });
    return this;
  }

  private static canEnabled<T>(tableConfig: TableConfig<T>): boolean {
    return NgxAurTableConfigUtil.actionConfigs(tableConfig).length > 0;
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

  public override addActionColumns(columns: string[]): RowActionProviderDummy<T> {
    return this;
  }

  public override applyAnchors(columns: string[]): RowActionProviderDummy<T> {
    return this;
  }

  public override setView(rows: TableRow<T>[]): RowActionProvider<T> {
    return this;
  }
}
