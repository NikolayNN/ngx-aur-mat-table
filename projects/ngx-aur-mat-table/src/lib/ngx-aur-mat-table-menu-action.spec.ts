import {NgxAurMatTableComponent} from './ngx-aur-mat-table.component';
import {ActionEvent} from './providers/RowActionProvider';

interface TestData {
  name: string;
}

describe('NgxAurMatTableComponent menu actions', () => {
  let component: NgxAurMatTableComponent<TestData>;

  beforeEach(() => {
    component = new NgxAurMatTableComponent(
      {} as any,
      {markForCheck: () => {}} as any
    );
  });

  // A mat-menu closes because a click on an item bubbles up to the menu panel,
  // whose host binding is (click)="closed.emit('click')". emitRowAction calls
  // $event.stopPropagation(), which would block that bubble and keep the menu
  // open. emitMenuAction therefore emits without touching any DOM event — its
  // signature has no event to stop, so propagation (and the close) is preserved.
  it('emitMenuAction emits onRowAction with the action and row, taking no DOM event', () => {
    const row: TestData = {name: 'Alice'};
    let received: ActionEvent<TestData> | undefined;
    component.onRowAction.subscribe((e) => (received = e));

    component.emitMenuAction('view', row);

    expect(received).toEqual({action: 'view', value: row});
  });
});
