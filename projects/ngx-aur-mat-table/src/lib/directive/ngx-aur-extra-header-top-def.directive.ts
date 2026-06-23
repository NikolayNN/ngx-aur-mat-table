import { Directive, TemplateRef } from '@angular/core';
import { AurExtraHeaderContext } from '../model/AurExtraHeaderContext';

/** Шаблон верхней доп-ячейки заголовка. <ng-template ngxAurExtraHeaderTopDef let-key="key" let-index="index">…</ng-template> */
@Directive({
  selector: '[ngxAurExtraHeaderTopDef]',
  standalone: false,
})
export class NgxAurExtraHeaderTopDefDirective {
  constructor(public templateRef: TemplateRef<AurExtraHeaderContext>) {}
}
