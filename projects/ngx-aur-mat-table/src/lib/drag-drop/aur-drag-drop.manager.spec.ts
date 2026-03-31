import {AurDragDropManager} from './aur-drag-drop.manager';
import {AurDragDropMapping} from './model/aur-drag-drop-mapping';

describe('AurDragDropManager', () => {

  it('should clear state after endDrag when afterDropFn returns null', () => {
    const mapping: AurDragDropMapping<any, any> = {
      sourceName: 'src',
      targetName: 'tgt',
      afterDropFn: () => null as any,
    };

    const manager = new AurDragDropManager({} as any, [mapping], []);

    // simulate full drag-drop cycle with null afterDropFn
    const fakeEvent = {dataTransfer: {setDragImage: () => {}}} as any;
    manager.startDrag('src', [{id: 1}], fakeEvent);
    manager.drop('tgt', {id: 2});
    manager.endDrag();

    // start a new drag — drop should NOT carry over from previous cycle
    manager.startDrag('src', [{id: 3}], fakeEvent);
    manager.endDrag();

    // Bug: old dropEvent survives, endDrag calls afterDropFn with stale context
    // Fix: state is cleared, endDrag returns early (no dropEvent)
    // If afterDropFn was called with stale context, this spy would have been called twice
    let callCount = 0;
    const countingMapping: AurDragDropMapping<any, any> = {
      sourceName: 'src',
      targetName: 'tgt',
      afterDropFn: () => {
        callCount++;
        return null as any;
      },
    };

    const manager2 = new AurDragDropManager({} as any, [countingMapping], []);

    // Full cycle: drag, drop, endDrag with null return
    manager2.startDrag('src', [{id: 1}], fakeEvent);
    manager2.drop('tgt', {id: 2});
    manager2.endDrag();
    expect(callCount).toBe(1);

    // New drag WITHOUT drop — endDrag should be a no-op
    manager2.startDrag('src', [{id: 3}], fakeEvent);
    manager2.endDrag();

    // Bug: callCount = 2 (stale dropEvent reused). Fix: callCount = 1
    expect(callCount).toBe(1);
  });
});
