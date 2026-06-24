## Несколько action-колонок

`actionCfg` принимает один объект (как раньше) или массив объектов — по одной колонке действий
на элемент. Каждая колонка независима.

| Поле | Назначение |
|---|---|
| `key` | Уникальный ключ = имя колонки (для `[displayColumns]` и anchor). Без `key` → `tbl_actions`. |
| `position` | `'start'` \| `'end'` (по умолчанию) \| `{ before: ключ }` \| `{ after: ключ }`. |
| `size` | Независимый размер колонки. |
| `actions` | Независимый набор действий/меню. |

Anchor `before`/`after` ссылается на любой ключ: data-колонку, другую action-колонку или
спец-колонку через `AUR_COLUMN` (`selection`/`index`/`drag`/`timeline`):

```ts
import { AUR_COLUMN } from 'ngx-aur-mat-table';

actionCfg: [
  { key: 'primary', position: 'start', actions: [ /* … */ ] },
  { key: 'tools', position: { after: 'email' }, actions: [ /* … */ ] },
  { key: 'manage', position: { before: AUR_COLUMN.selection }, actions: [ /* … */ ] },
]
```

Якорь не найден → колонка уходит в конец (в dev — предупреждение в консоль). Дубликат/конфликт
`key` → колонка пропускается (dev-warn). Полный ручной контроль порядка — через `[displayColumns]`
(имена action-колонок = их `key`), он имеет наивысший приоритет.
