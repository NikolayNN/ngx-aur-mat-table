import { Directive, TemplateRef } from '@angular/core';
import { AurExtraHeaderContext } from '../model/AurExtraHeaderContext';

/** Шаблон нижней доп-ячейки заголовка. <ng-template ngxAurExtraHeaderBottomDef let-key="key" let-index="index">…</ng-template> */
@Directive({
  selector: '[ngxAurExtraHeaderBottomDef]',
  standalone: false,
})
export class NgxAurExtraHeaderBottomDefDirective {
  constructor(public templateRef: TemplateRef<AurExtraHeaderContext>) {}
}
