import {NgxAurFilters} from './NgxAurFilters';
import {TableRow} from '../model/TableRow';

interface TestData {
  name: string;
}

class NameContainsFilter extends NgxAurFilters.ContainsStringIgnoreCase<TestData> {
  extractProperty(data: TableRow<TestData>): string {
    return data['name'];
  }
}

function row(id: number, name: string): TableRow<TestData> {
  const r = new TableRow<TestData>(id, {name});
  r['name'] = name;
  return r;
}

describe('NgxAurFilters.ContainsStringIgnoreCase', () => {

  it('should pass all rows when filter value is null', () => {
    const filter = new NameContainsFilter(null as any);
    const fn = filter.filterFn();

    // Bug: "hello" passes, but "undefined" also passes because
    // includes(undefined) searches for literal "undefined"
    expect(fn(row(0, 'hello'))).toBeTrue();
    expect(fn(row(1, 'undefined value'))).toBeTrue();
    expect(fn(row(2, 'world'))).toBeTrue();
  });

  it('should pass all rows when filter value is undefined', () => {
    const filter = new NameContainsFilter(undefined as any);
    const fn = filter.filterFn();

    expect(fn(row(0, 'hello'))).toBeTrue();
    expect(fn(row(1, 'world'))).toBeTrue();
  });
});
