import { NgxAurTableConfigUtil } from './ngx-aur-table-config.util';
import { TableConfig } from '../model/ColumnConfig';

function base(actionCfg: any): TableConfig<any> {
  return { columnsCfg: [{ name: 'N', key: 'name', valueConverter: (v: any) => v.name }], actionCfg };
}

describe('NgxAurTableConfigUtil — action helpers', () => {
  it('actionConfigs: undefined → []', () => {
    expect(NgxAurTableConfigUtil.actionConfigs(base(undefined))).toEqual([]);
  });

  it('actionConfigs: одиночный объект → [объект]', () => {
    const cfg = { actions: [] };
    expect(NgxAurTableConfigUtil.actionConfigs(base(cfg))).toEqual([cfg as any]);
  });

  it('actionConfigs: массив, отфильтровывает enable:false', () => {
    const a = { key: 'a', actions: [] };
    const b = { key: 'b', enable: false, actions: [] };
    expect(NgxAurTableConfigUtil.actionConfigs(base([a, b]))).toEqual([a as any]);
  });

  it('actionColumnName: key или дефолт tbl_actions', () => {
    expect(NgxAurTableConfigUtil.actionColumnName({ actions: [] })).toBe('tbl_actions');
    expect(NgxAurTableConfigUtil.actionColumnName({ key: 'x', actions: [] })).toBe('x');
  });

  it('actionColumnNames: уникальные имена включённых колонок', () => {
    expect(NgxAurTableConfigUtil.actionColumnNames(base([
      { key: 'a', actions: [] }, { key: 'b', actions: [] },
    ]))).toEqual(['a', 'b']);
  });
});
