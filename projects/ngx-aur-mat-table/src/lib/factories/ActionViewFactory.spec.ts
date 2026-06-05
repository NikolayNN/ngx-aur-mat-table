import {ActionViewFactory} from './ActionViewFactory';
import {ActionConfig} from '../model/ColumnConfig';
import {TableRow} from '../model/TableRow';

interface Customer {
  name: string;
  age: number;
}

describe('ActionViewFactory menu resolution', () => {
  const young = new TableRow<Customer>(0, {name: 'Ann', age: 20});
  const old = new TableRow<Customer>(1, {name: 'Bob', age: 50});

  function configWithMenu(): ActionConfig<Customer> {
    return {
      actions: [
        {
          action: () => 'more',
          icon: {name: () => 'more_vert'},
          menu: [
            {
              action: () => 'edit',
              text: (c) => c.name,
              icon: {name: () => 'edit', color: () => 'blue'},
            },
            {
              action: () => 'delete',
              text: () => 'Delete',
              visible: (c) => c.age >= 21,
              disabled: (c) => c.age < 21,
            },
          ],
        },
      ],
    };
  }

  it('resolves menu item functions to booleans per row', () => {
    const view = ActionViewFactory.create([old], configWithMenu());
    const action = view.get(old.id)![0];

    expect(action.action).toBe('more');
    expect(action.menu).toBeDefined();
    expect(action.menu!.length).toBe(2);

    const edit = action.menu![0];
    expect(edit.action).toBe('edit');
    expect(edit.text).toBe('Bob');
    expect(edit.icon!.name).toBe('edit');
    expect(edit.icon!.color).toBe('blue');
    expect(edit.visible).toBe(true);
    expect(edit.disabled).toBe(false);
  });

  it('applies per-row display and disabled conditions', () => {
    const view = ActionViewFactory.create([young], configWithMenu());
    const del = view.get(young.id)![0].menu![1];

    expect(del.visible).toBe(false);
    expect(del.disabled).toBe(true);
    expect(del.icon).toBeUndefined();
  });

  it('leaves menu undefined for actions without a menu', () => {
    const config: ActionConfig<Customer> = {
      actions: [{action: () => 'edit', icon: {name: () => 'edit'}}],
    };
    const view = ActionViewFactory.create([old], config);

    expect(view.get(old.id)![0].menu).toBeUndefined();
  });
});
