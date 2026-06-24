import { AUR_COLUMN, DEFAULT_ACTION_COLUMN } from './ColumnConfig';
import { SelectionProvider } from '../providers/SelectionProvider';
import { IndexProvider } from '../providers/IndexProvider';
import { TimelineProvider } from '../providers/TimelineProvider';
import { RowActionProvider } from '../providers/RowActionProvider';

describe('AUR_COLUMN', () => {
  it('значения совпадают с COLUMN_NAME спец-колонок', () => {
    expect(AUR_COLUMN.selection).toBe(SelectionProvider.COLUMN_NAME);
    expect(AUR_COLUMN.index).toBe(IndexProvider.COLUMN_NAME);
    expect(AUR_COLUMN.timeline).toBe(TimelineProvider.COLUMN_NAME);
    // DragDropProvider.COLUMN_NAME — instance-поле, сверяем с литералом
    expect(AUR_COLUMN.drag).toBe('tbl_drag_col');
  });

  it('DEFAULT_ACTION_COLUMN совпадает с RowActionProvider.COLUMN_NAME', () => {
    expect(DEFAULT_ACTION_COLUMN).toBe(RowActionProvider.COLUMN_NAME);
  });
});
