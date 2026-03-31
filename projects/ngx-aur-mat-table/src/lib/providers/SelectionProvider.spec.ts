import {SelectionProviderDummy} from './SelectionProvider';

describe('SelectionProviderDummy', () => {
  it('should have isEnabled = false', () => {
    const dummy = new SelectionProviderDummy();
    expect(dummy.isEnabled).toBeFalse();
  });
});
