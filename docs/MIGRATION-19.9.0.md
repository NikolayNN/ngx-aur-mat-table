# Миграция на 19.9.0

## `[highlight]` больше не раскрывает detail-строку (breaking)

Раскрытие detail-строки (`extendedRowTemplate`) стало самостоятельным состоянием,
развязанным от подсветки. `[highlight]` теперь только подсвечивает строку и скроллит к ней.

**Было (≤19.8.x):** программное раскрытие через `[highlight]`.

**Стало (19.9.0):** используйте новые инпуты.

```html
<!-- single -->
<aur-mat-table [extendedRowTemplate]="tpl" [(expandedRow)]="openRow" ...></aur-mat-table>

<!-- multiple: задайте extendedRowCfg: { multiple: true } в tableConfig -->
<aur-mat-table [extendedRowTemplate]="tpl" [tableConfig]="cfg"
               [(expandedRows)]="openRows" ...></aur-mat-table>
```

Если вы НЕ использовали `[highlight]` для раскрытия — изменений в вашем коде не требуется,
клик по строке раскрывает её как раньше (дефолт `mode: 'row-click'`).

## Поведение повторного клика

В режиме `row-click` повторный клик по уже раскрытой строке теперь сворачивает её
независимо от `clickCfg.cancelable`. Раньше без `cancelable` строка оставалась раскрытой.
