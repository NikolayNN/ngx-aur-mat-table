import { PaginationProvider } from './PaginationProvider';
import { TableConfig } from '../model/ColumnConfig';

function cfg(pagination?: any): TableConfig<any> {
  return { columnsCfg: [], paginationCfg: pagination } as TableConfig<any>;
}

describe('PaginationProvider enable opt-out', () => {
  it('is enabled when paginationCfg is present without enable', () => {
    expect(PaginationProvider.canEnable(cfg({ size: 10 }))).toBe(true);
  });

  it('is disabled when enable is false', () => {
    expect(PaginationProvider.canEnable(cfg({ size: 10, enable: false }))).toBe(false);
  });

  it('is disabled when paginationCfg is absent', () => {
    expect(PaginationProvider.canEnable(cfg(undefined))).toBe(false);
  });
});
