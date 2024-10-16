import {ComponentRef, ViewContainerRef} from "@angular/core";

import {AurDragPreviewMappings} from "./model/aur-drag-drop-mapping";
import {AurDragPreviewComponent} from "./model/aur-drag-preview-component";

export class DragPreviewManager {

  private readonly previewStorage = new Map<string, new () => AurDragPreviewComponent<any>>();
  private currentPreviewComponentRef: ComponentRef<AurDragPreviewComponent<any>> | undefined;

  constructor(private viewContainerRef: ViewContainerRef,
              mappings: AurDragPreviewMappings<any>[]) {
    this.fillStorage(mappings);
  }

  private fillStorage(mappings: AurDragPreviewMappings<any>[]) {
    mappings.forEach(m => {
      if (this.previewStorage.has(m.sourceName)) {
        console.log(`WARN: Duplicate drag preview mapping for source ${m.sourceName}`)
      }
      this.previewStorage.set(m.sourceName, m.preview!);
    });
  }

  public showPreview(sourceName: string, event: DragEvent, draggedData: unknown[]) {
    this.previewStorage.forEach((k, v) => console.log('key', k, 'value', v))
    let previewConstructor = this.previewStorage.get(sourceName);
    if (previewConstructor) {
      // Динамически создаем компонент превью
      this.currentPreviewComponentRef = this.viewContainerRef.createComponent(previewConstructor);
      this.currentPreviewComponentRef.instance.data = draggedData;

      const nativePreview = this.currentPreviewComponentRef.location.nativeElement;

      // Применение необходимых стилей к элементу превью
      nativePreview.style.position = 'absolute';
      nativePreview.style.top = '0';
      nativePreview.style.left = '-9999px'; // Скрыть элемент за пределами экрана
      document.body.appendChild(nativePreview); // Временно добавляем в DOM для отображения

      event.dataTransfer?.setDragImage(nativePreview, 0, 0);
    }
  }

  public removePreview() {
    if (this.currentPreviewComponentRef) {
      document.body.removeChild(this.currentPreviewComponentRef.location.nativeElement);
      this.currentPreviewComponentRef.destroy();
      this.currentPreviewComponentRef = undefined;
    }
  }
}
