# Total row по умолчанию только на последней странице (`showOnEveryPage`)

**Дата:** 2026-06-09
**Статус:** Design (одобрен к реализации)
**Тип изменения:** меняет дефолтное поведение (итоги теперь по умолчанию только на
последней странице пагинации). По решению — выпуск как **minor** (19.3.0) с явной заметкой
в changelog, а не major. Риск: потребители, полагающиеся на итоги на каждой странице,
получат изменённое поведение без правок кода — митигируется заметкой в changelog и
opt-in флагом `showOnEveryPage: true`.

## Проблема

При `paginationCfg.enable: true` и включённом total row строка итогов рендерится как footer
на **каждой** странице. При `stickyCfg.total: true` она ещё и прилипает к низу. Пользователь
на странице 1 из N видит итоги и думает, что дошёл до конца таблицы — это вводит в заблуждение.

Усугубляется тем, что итоги считаются по **всем** данным
(`TotalRowProvider.setTotalRow()` → `col.totalConverter(this.tableDataSource.data)`),
а не по срезу страницы. То есть на первой странице показывается grand total.

**Подтверждение в коде** (`ngx-aur-mat-table.component.html:381-384`):

```html
<ng-container *ngIf="totalRowProvider.isEnabled">
  <tr mat-footer-row *matFooterRowDef="_displayColumns; sticky: this.tableConfig.stickyCfg?.total"
      [style]="_totalStyle" [ngClass]="_totalClass"></tr>
</ng-container>
```

Единственное условие показа — `totalRowProvider.isEnabled`. Связи с текущей страницей нет.

Кейс из проекта `locator-front`: отчёт `report-tab` (`size: 50`) показывает total row внизу
каждой страницы.

## Решение

Сделать показ итогов **только на последней странице поведением по умолчанию**. Показ на
каждой странице остаётся доступен через явный opt-in флаг `showOnEveryPage: true` в
`TotalRowConfig`.

Видимость вычисляется методом в шаблоне (OnPush re-evaluation на каждом CD-цикле —
`page`/`filter`/`sort`-события триггерят CD автоматически). Прецедент уже есть:
`isFeatureEnabled(cfg)` вызывается в шаблоне.

### 1. Контракт — `model/ColumnConfig.ts`

```ts
export interface TotalRowConfig<T> {
  /** Показать строку итогов. По умолчанию включено, когда какая-либо колонка определяет `totalConverter`; `false` выключает. */
  enable?: boolean;
  styleCfg?: TotalStyleConfig<T>;
  /**
   * Показывать строку итогов на каждой странице пагинации.
   * default false — итоги показываются ТОЛЬКО на последней странице (поведение по умолчанию).
   * true — итоги показываются на каждой странице (прежнее поведение до 19.3.0).
   * Если пагинация выключена — итоги показываются всегда (опция не влияет).
   */
  showOnEveryPage?: boolean;
}
```

### 2. Логика — `ngx-aur-mat-table.component.ts`

```ts
isTotalRowVisible(): boolean {
  if (this.tableConfig.totalRowCfg?.showOnEveryPage) return true;    // явный opt-in: на каждой странице
  if (!this.paginationProvider.isEnabled) return true;               // пагинация выключена → всегда
  const { pageIndex, lastPageIndex } = this.currentPaging();
  return pageIndex >= lastPageIndex;                                 // default: только последняя страница
}

private currentPaging(): { pageIndex: number; lastPageIndex: number } {
  let total: number, pageIndex: number, pageSize: number;
  if (this.paginatorState) {                       // server wiring (как в getTimelineVisibleData)
    total = this.paginatorState.length;
    pageIndex = this.paginatorState.pageIndex;
    pageSize = this.paginationProvider.size;
  } else {                                          // client
    total = this.tableDataSource.filteredData.length;
    pageIndex = this.activePaginator?.pageIndex ?? 0;
    pageSize = this.activePaginator?.pageSize ?? this.paginationProvider.size;
  }
  const lastPageIndex = pageSize > 0 ? Math.max(0, Math.ceil(total / pageSize) - 1) : 0;
  return { pageIndex, lastPageIndex };
}
```

- `>=` вместо `===` — чтобы строка никогда не «застряла» скрытой при overshoot `pageIndex`;
  на реальной последней странице эквивалентно `===`.
- Ветвление по наличию `this.paginatorState` повторяет существующую логику
  `getTimelineVisibleData()` (server wiring ставит `paginatorState`, client — нет).

### 3. Шаблон — `ngx-aur-mat-table.component.html:381`

Строку итогов **нельзя** скрывать через внешний `*ngIf` по `isTotalRowVisible()`: в текущей
версии CDK table динамическое добавление/удаление `*matFooterRowDef` после первого рендера
не перерисовывает footer-outlet (флаг `_footerRowDefChanged` не переустанавливается при
изменении `ContentChildren`). Внешний `*ngIf="totalRowProvider.isEnabled"` работает только
потому, что он стабилен с момента инициализации (не переключается по страницам).

Поэтому footer-строка остаётся **всегда зарегистрированной**, а её видимость управляется
инлайновым `display`-биндингом:

```html
<ng-container *ngIf="totalRowProvider.isEnabled">
  <tr mat-footer-row *matFooterRowDef="_displayColumns; sticky: this.tableConfig.stickyCfg?.total"
      [style]="_totalStyle" [ngClass]="_totalClass"
      [style.display]="isTotalRowVisible() ? null : 'none'"></tr>
</ng-container>
```

`[style]` (общий стиль) и `[style.display]` (конкретное свойство) сосуществуют — Angular
отдаёт приоритет конкретному биндингу для `display`. Когда строка видна, `display` = `null`
→ возвращается дефолтный `table-row`, и `sticky: stickyCfg?.total` работает на той странице,
где итоги показываются. Для пользователя поведение идентично «не отрендерено» — строка не видна
на непоследних страницах.

## Поведение по кейсам

| Кейс | Результат |
|------|-----------|
| `showOnEveryPage: true` | `return true` сразу — итоги на каждой странице (прежнее поведение) |
| Пагинация выключена (`paginationCfg` нет / `enable: false`) | `return true` — итоги всегда |
| Default, одна страница (данные влезают) | `lastPageIndex=0`, `pageIndex=0` → видно |
| Default, пустые данные (`total=0`) | `lastPageIndex=max(0,…)=0`, `pageIndex=0` → видно |
| Default, несколько страниц, не последняя | `pageIndex < lastPageIndex` → скрыто |
| Default, несколько страниц, последняя | `pageIndex >= lastPageIndex` → видно |
| Смена страницы через `pageChange` | CD после `(page)` → метод перевычисляется автоматически |
| `mode: 'client'` | ветка `else` в `currentPaging()` (`activePaginator` + `filteredData`) |
| `mode: 'server'` | ветка `this.paginatorState` (`length` + `paginationProvider.size`) |

## Тестирование (TDD)

Добавить в `ngx-aur-mat-table-pagination.spec.ts` (или новый spec):

1. **Default, client** — total row скрыт на странице 0 из N, виден на последней.
2. **Default, server** — то же через `paginatorState` (`length` / `paginationProvider.size`).
3. **`showOnEveryPage: true`** — total row виден на любой странице (прежнее поведение).
4. **Одна страница** — total row виден (одна страница = последняя).
5. **Пагинация выключена** — total row виден независимо от опции.
6. **Пустые данные** — total row виден.

## Затронутые файлы

- `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` — поле `showOnEveryPage`.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` — `isTotalRowVisible()` + `currentPaging()`.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` — условие в `*ngIf`.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-pagination.spec.ts` — тесты.
- `projects/ngx-aur-mat-table/package.json` — bump 19.2.0 → 19.3.0.
- Changelog — запись о новом дефолте + флаге `showOnEveryPage` (с пометкой о смене поведения).

## Использование (после реализации)

Новый дефолт даёт нужное `report-tab` поведение **без флага**:

```ts
totalRowCfg: {
  enable: !report.buildInfo.united,
  styleCfg: {class: 'total not-hover'}
}
// итоги автоматически только на последней странице
```

Чтобы вернуть прежнее поведение (итоги на каждой странице):

```ts
totalRowCfg: {
  enable: true,
  showOnEveryPage: true,
  styleCfg: {class: 'total not-hover'}
}
```
