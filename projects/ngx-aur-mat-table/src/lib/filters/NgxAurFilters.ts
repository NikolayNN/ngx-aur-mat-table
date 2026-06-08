import {TableRow} from "../model/TableRow";

export namespace NgxAurFilters {

  /**
   * Базовый абстрактный класс фильтра.
   * Определяет общий интерфейс для всех фильтров.
   * @template T Тип данных, подлежащих фильтрации.
   */
  export abstract class Base<T> {

    constructor() {
    }

    /**
     * Абстрактный метод для создания функции фильтрации для использования с MatTable из Angular Material.
     * Эта функция используется как логика фильтрации, применяемая к данным, отображаемым в таблице.
     * Должна быть переопределена в подклассах для предоставления собственных критериев фильтрации.
     *
     * @returns Функция фильтрации, принимающая единственный параметр:
     *    - `data`: Отдельный элемент данных из источника данных MatTable. Представляет
     *      одну строку данных в таблице. Тип `data` определяется обобщённым
     *      параметром типа 'T'.
     *
     * Функция должна возвращать булево значение, указывающее, удовлетворяет ли элемент `data`
     * критериям фильтрации. Конкретная реализация логики фильтрации
     * будет различаться в зависимости от требований приложения и характера данных.
     */
    public abstract filterFn(): (data: TableRow<T>) => boolean;

    /**
     * Определяет, эквивалентен ли текущий фильтр другому фильтру.
     * Этот метод используется для сравнения текущего применённого фильтра с новым фильтром.
     * Если фильтры эквивалентны, метод должен вернуть `true`, указывая, что
     * таблицу данных не нужно перестраивать. Если они не эквивалентны, он должен
     * вернуть `false`, указывая, что таблицу следует обновить, чтобы отразить новый фильтр.
     *
     * Реализация этого метода в подклассах позволяет оптимизировать отрисовку, избегая
     * ненужных обновлений таблицы, когда критерии фильтрации фактически не изменились.
     *
     * @param other Фильтр для сравнения с текущим фильтром.
     * @returns `true`, если текущий фильтр и фильтр `other` эквивалентны, иначе `false`.
     */
    public abstract equals(other: Base<T>): boolean;
  }

  export abstract class ExtractableProperty<T, V> extends Base<T> {
    abstract extractProperty(data: TableRow<T>): V;
  }


  /**
   * Класс для фильтрации данных на основе одного значения.
   * @template T Тип данных, подлежащих фильтрации.
   * @template V Тип значения, используемого для фильтрации.
   */
  export abstract class ValueSingle<T, V> extends ExtractableProperty<T, V> {

    constructor(public value: V) {
      super();
    }

    override equals(other: ValueSingle<T, V>): boolean {
      return this.value === other.value;
    }
  }

  /**
   * Класс для фильтрации данных на основе массива значений.
   * @template T Тип данных, подлежащих фильтрации.
   * @template V Тип значений, используемых для фильтрации.
   */
  export abstract class ValueArray<T, V> extends ExtractableProperty<T, V> {

    constructor(public values: V[]) {
      super();
    }
  }

  /**
   * Класс для фильтрации данных на основе множества значений.
   * @template T Тип данных, подлежащих фильтрации.
   * @template V Тип значений, используемых для фильтрации.
   */
  export abstract class ValueSet<T, V> extends ExtractableProperty<T, V> {

    constructor(public values: Set<V>) {
      super();
    }
  }

  /**
   * Класс для фильтрации данных в диапазоне min-max.
   * @template T Тип данных, подлежащих фильтрации.
   * @template V Тип значений, определяющих диапазон.
   */
  export abstract class ValueMinMax<T, V> extends ExtractableProperty<T, V> {
    constructor(protected _min: V,
                protected _max: V) {
      super();
    }

    get min(): V {
      return this._min;
    }

    get max(): V {
      return this._max;
    }


    override equals(other: ValueMinMax<T, V>): boolean {
      return this._min === other._min && this._max === other._max;
    }
  }

  /**
   * Класс для фильтрации данных в диапазоне min-max.
   * @template T Тип данных, подлежащих фильтрации.
   * @template V Тип значений, определяющих диапазон.
   */
  export abstract class ValueMinMaxNumber<T> extends ValueMinMax<T, number> {
    constructor(min: number,
                max: number) {
      super(min, max);
    }

    override get min(): number {
      return this._min ?? -Number.MAX_VALUE;
    }

    override get max(): number {
      return this._max ?? Number.MAX_VALUE;
    }
  }

  /**
   * Абстрактный класс для фильтрации данных по тому, содержит ли определённое свойство
   * данных, после обрезки и приведения к нижнему регистру, заданную
   * подстроку, также обрезанную и приведённую к нижнему регистру.
   * @template T Тип данных, подлежащих фильтрации.
   */
  export abstract class ContainsStringIgnoreCase<T> extends ValueSingle<T, string> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        if (!this.value) return true;
        const given = this.extractProperty(data);
        return given?.toLowerCase().includes(this.value.toLowerCase()) ?? false;
      };
    }
  }

  export abstract class EqualString<T> extends ValueSingle<T, string> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return given === this.value;
      };
    }
  }

  export abstract class EqualNumber<T> extends ValueSingle<T, number> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return given === this.value;
      };
    }
  }

  export abstract class LessNumber<T> extends ValueSingle<T, number> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return given < this.value;
      };
    }
  }

  export abstract class LessOrEqualNumber<T> extends ValueSingle<T, number> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return given <= this.value;
      };
    }
  }

  export abstract class MoreNumber<T> extends ValueSingle<T, number> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return given > this.value;
      };
    }
  }

  export abstract class MoreOrEqualNumber<T> extends ValueSingle<T, number> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return given >= this.value;
      };
    }
  }

  export abstract class NumberRangeInclMinExclMax<T> extends ValueMinMaxNumber<T> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return given >= this.min && given < this.max;
      };
    }
  }

  export abstract class NumberRangeExclMinInclMax<T> extends ValueMinMaxNumber<T> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return given > this.min && given <= this.max;
      };
    }
  }

  export abstract class NumberRangeInclMinInclMax<T> extends ValueMinMaxNumber<T> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return given >= this.min && given <= this.max;
      };
    }
  }

  export abstract class NumberRangeExclMinExclMax<T> extends ValueMinMaxNumber<T> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return given > this.min && given < this.max;
      };
    }
  }

  export abstract class hasInSet<T, V> extends ValueSet<T, V> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return this.values.has(given);
      };
    }
  }

  export abstract class notHasInSet<T, V> extends ValueSet<T, V> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return !this.values.has(given);
      };
    }
  }

  /**
   * Класс составного фильтра, объединяющий несколько фильтров с помощью логического AND.
   * @template T Тип данных, подлежащих фильтрации.
   */
  export abstract class CompositeAndFilter<T> extends Base<T> {
    private filters: Base<T>[];

    protected constructor(filters: Base<T>[]) {
      super();
      this.filters = filters || [];
    }

    /**
     * Создаёт функцию фильтрации, объединяющую функции фильтрации всех
     * фильтров составного фильтра с помощью логического AND.
     *
     * @returns Функция фильтрации, принимающая единственный параметр:
     *    - `data`: Отдельный элемент данных из источника данных MatTable.
     *      Тип `data` определяется обобщённым параметром типа 'T'.
     *
     * Функция возвращает `true`, если все фильтры составного фильтра возвращают `true`
     * для элемента `data`, иначе `false`.
     */
    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        return this.filters.every(filter => filter.filterFn()(data));
      };
    }

    /**
     * Определяет, эквивалентен ли текущий составной фильтр другому фильтру.
     * Этот метод используется для сравнения текущего применённого составного фильтра с новым фильтром.
     *
     * @param other Фильтр для сравнения с текущим фильтром.
     * @returns `true`, если текущий фильтр и фильтр `other` эквивалентны, иначе `false`.
     */
    public override equals(other: Base<T>): boolean {
      if (!(other instanceof CompositeAndFilter)) {
        return false;
      }

      if (this.filters.length !== other.filters.length) {
        return false;
      }

      return this.filters.every((filter, index) => filter.equals(other.filters[index]));
    }
  }

}
