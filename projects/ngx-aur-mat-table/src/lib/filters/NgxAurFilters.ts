import {TableRow} from "../model/TableRow";

export namespace NgxAurFilters {

  /**
   * Base abstract class for filter.
   * Defines a common interface for all filters.
   * @template T The type of data to be filtered.
   */
  export abstract class Base<T> {

    constructor() {
    }

    /**
     * Abstract method to create a filter function for use with Angular Material's MatTable.
     * This function is used as the filtering logic applied to the data displayed in the table.
     * It must be overridden in subclasses to provide custom filter criteria.
     *
     * @returns A filter function that takes a single parameter:
     *    - `data`: An individual data item from the MatTable data source. This represents
     *      a single row of data in the table. The type of `data` is defined by the generic
     *      type parameter 'T'.
     *
     * The function should return a boolean value indicating whether the `data` item
     * satisfies the filter criteria. The specific implementation of the filter logic
     * will vary depending on the application's requirements and the nature of the data.
     */
    public abstract filterFn(): (data: TableRow<T>) => boolean;

    /**
     * Determines whether the current filter is equivalent to another filter.
     * This method is used to compare the current applied filter with a new filter.
     * If the filters are equivalent, the method should return `true`, indicating that
     * the data table does not need to be rebuilt. If they are not equivalent, it should
     * return `false`, indicating that the table should be updated to reflect the new filter.
     *
     * Implementing this method in subclasses allows for optimized rendering by avoiding
     * unnecessary table updates when the filter criteria have not actually changed.
     *
     * @param other The filter to compare with the current filter.
     * @returns `true` if the current filter and the `other` filter are equivalent, otherwise `false`.
     */
    public abstract equals(other: Base<T>): boolean;
  }

  export abstract class ExtractableProperty<T, V> extends Base<T> {
    abstract extractProperty(data: TableRow<T>): V;
  }


  /**
   * Class for filtering data based on a single value.
   * @template T The type of data to be filtered.
   * @template V The type of the value used for filtering.
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
   * Class for filtering data based on an array of values.
   * @template T The type of data to be filtered.
   * @template V The type of the values used for filtering.
   */
  export abstract class ValueArray<T, V> extends ExtractableProperty<T, V> {

    constructor(public values: V[]) {
      super();
    }
  }

  /**
   * Class for filtering data based on a set of values.
   * @template T The type of data to be filtered.
   * @template V The type of the values used for filtering.
   */
  export abstract class ValueSet<T, V> extends ExtractableProperty<T, V> {

    constructor(public values: Set<V>) {
      super();
    }
  }

  /**
   * Class for filtering data within a min-max range.
   * @template T The type of data to be filtered.
   * @template V The type of the values defining the range.
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
   * Class for filtering data within a min-max range.
   * @template T The type of data to be filtered.
   * @template V The type of the values defining the range.
   */
  export abstract class ValueMinMaxNumber<T> extends ValueMinMax<T, number> {
    constructor(min: number,
                max: number) {
      super(min, max);
    }

    override get min(): number {
      return this._min ?? Number.MIN_VALUE;
    }

    override get max(): number {
      return this._max ?? Number.MAX_VALUE;
    }
  }

  /**
   * Abstract class for filtering data based on whether a specific property
   * of the data, when trimmed and converted to lower case, contains a specified
   * substring, also trimmed and converted to lower case.
   * @template T The type of data to be filtered.
   */
  export abstract class ContainsStringIgnoreCase<T> extends ValueSingle<T, string> {

    public override filterFn(): (data: TableRow<T>) => boolean {
      return (data) => {
        const given = this.extractProperty(data);
        return given.toLowerCase().includes(this.value.toLowerCase());
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

}
