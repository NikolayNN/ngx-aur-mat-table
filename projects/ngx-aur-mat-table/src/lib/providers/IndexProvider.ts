import {ColumnSize, ColumnView, IndexConfig, TableConfig} from "../model/ColumnConfig";
import {AbstractProvider} from "./AbstractProvider";
import { isFeatureEnabled } from "../utils/feature-enabled.util";

/**
 * Предоставляет функциональность для управления колонкой индекса в таблице.
 * Класс может обрабатывать настройки индекса и изменять массив колонок, добавляя в него колонку индекса.
 */
export class IndexProvider extends AbstractProvider {
  public readonly isEnabled: boolean = true;
  public static readonly COLUMN_NAME = 'tbl_index';
  public headerView: ColumnView<string> | undefined;
  public name: string;
  public offset: number;
  public size: ColumnSize | undefined;
  public formatter: ((index: number) => string) | undefined;

  constructor(private indexConfig?: IndexConfig) {
    super();
    this.headerView = indexConfig?.headerColumn;
    this.name = indexConfig?.name || '';
    this.offset = indexConfig?.offset || 0;
    this.size = indexConfig?.size;
    this.formatter = indexConfig?.formatter;
  }

  get COLUMN_NAME() {
    return IndexProvider.COLUMN_NAME;
  }

  /** Отображаемое значение индекса для строки с данным id: offset применён, затем форматтер. */
  public format(id: number): string {
    const index = id + this.offset;
    return this.formatter ? this.formatter(index) : String(index);
  }

  /**
   * Добавляет колонку индекса в начало массива колонок.
   * @param columns Массив имён колонок, в который должна быть добавлена колонка индекса.
   * @returns Экземпляр IndexProvider для цепочки вызовов.
   */
  public addIndexColumn(columns: string[]): IndexProvider {
    if (this.notHasKey(this.COLUMN_NAME, columns)) {
      columns.unshift(this.COLUMN_NAME);
    }
    return this;
  }

  /**
   * Фабричный метод для создания экземпляра IndexProvider на основе настройки таблицы.
   * Возвращает заглушку-провайдер, если индекс не включён в настройке.
   * @param tableConfig Настройка таблицы.
   * @returns Экземпляр IndexProvider или IndexProviderDummy.
   */
  public static create<T>(tableConfig: TableConfig<T>): IndexProvider {
    if (IndexProvider.canCreate(tableConfig)) {
      return new IndexProvider(<IndexConfig>tableConfig.indexCfg);
    }
    return new IndexProviderDummy();
  }

  private static canCreate<T>(tableConfig: TableConfig<T>): boolean {
    return isFeatureEnabled(tableConfig.indexCfg);
  }
}


/**
 * Заглушка-реализация IndexProvider, которая используется, когда функциональность индекса не включена.
 * Этот класс переопределяет некоторые методы, предоставляя пустые реализации.
 */
export class IndexProviderDummy extends IndexProvider {
  public override readonly isEnabled = false;

  /**
   * Переопределяет метод addIndexColumn, возвращая себя без изменения массива колонок.
   * @param columns Массив имён колонок.
   * @returns Экземпляр IndexProviderDummy для цепочки вызовов.
   */
  public override addIndexColumn(columns: string[]): IndexProviderDummy {
    // Операция не выполняется, так как индекс не включён.
    return this;
  }
}
