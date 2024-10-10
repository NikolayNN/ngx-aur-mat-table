import {ComponentRef, ViewContainerRef} from "@angular/core";

/**
 * Interface representing the mapping configuration for drag-and-drop functionality
 * between components. It defines the source component (from where data is grabbed)
 * and the target component (where data is dropped), as well as the functions that handle
 * the grabbing and dropping of data.
 *
 * @template SOURCE - The type of data used by the source component.
 * @template TARGET - The type of data used by the target component.
 */
export interface AurDragDropMapping<SOURCE, TARGET> {

  /**
   * The name of the source component from which data can be grabbed.
   * This represents the component that allows a user to initiate a grab action.
   */
  readonly sourceName: string,

  /**
   * The name of the target component where the data can be dropped.
   * This represents the component that accepts the drop action.
   */
  readonly targetName: string,

  /**
   * Function called to handle grabbing data from the source component.
   * It is invoked after a drop has occurred, and it describes what should
   * happen to the data in the source table.
   *
   * @param ctx - The grab context containing information about the source and target.
   * @returns An array of data elements of type SOURCE.
   */
  readonly grabFn: (ctx: grabContext<SOURCE, TARGET>) => SOURCE[]

  /**
   * Function called to handle the drop action in the target component.
   * It is invoked when the drop event occurs, and it describes how to process
   * the data into the target component.
   *
   * @param ctx - The drop context containing information about the source and target.
   * @returns An array of data elements of type TARGET.
   */
  readonly dropFn: (ctx: DropContext<SOURCE, TARGET>) => TARGET[],

  readonly preview?: new () => AurDragPreviewComponent<SOURCE>;
}

/**
 * Общий интерфейс для компонентов, которые используются в качестве превью
 * для перетаскивания данных. Это обеспечивает стандартный способ передачи
 * данных в такие компоненты.
 *
 * @template DATA - Тип данных, которые будут переданы в компонент для превью.
 */
export interface AurDragPreviewComponent<DATA> {
  /**
   * Данные, которые будут отображаться в компоненте превью.
   */
  data: DATA[];
}

interface DragStartContext {
  readonly name: string,
  readonly data: unknown[]
}

interface DragEndContext {
  readonly name: string,
  readonly data: unknown
}

export interface grabContext<SOURCE, TARGET> {
  readonly sourceName: string,
  readonly sourceData: SOURCE[],
  readonly sourceDataset: SOURCE[],

  readonly targetName: string,
  readonly targetData: TARGET,
}

export interface DropContext<SOURCE, TARGET> {
  readonly sourceName: string,
  readonly sourceData: SOURCE[],

  readonly targetDataset: TARGET[],
  readonly targetName: string,
  readonly targetData: TARGET,
}

export class AurDragDropManager {

  private dragStartCtx: DragStartContext | undefined;
  private dragEndCtx: DragEndContext | undefined;
  private currentPreviewComponentRef:  ComponentRef<AurDragPreviewComponent<any>> | undefined;

  //can drop [key from table, value to table name]
  private canDropStorage = new Map<string, Set<string>>();

  constructor(private viewContainerRef: ViewContainerRef,
              private mappings: AurDragDropMapping<any, any>[]) {
    this.mappings.forEach(m => {
      if (!this.canDropStorage.has(m.sourceName)) {
        this.canDropStorage.set(m.sourceName, new Set());
      }
      this.canDropStorage.get(m.sourceName)!.add(m.targetName);
    });
  }

  startDrag(sourceName: string, data: unknown[], event: DragEvent) {
    this.dragStartCtx = {name: sourceName, data: data}
    this.showDragPreview(sourceName, event, data)
  }

  endDrag(sourceDataset: unknown[]): unknown[] {
    this.removeDragPreview()
    return this.endDragInternal({
      targetData: this.dragEndCtx!.data,
      targetName: this.dragEndCtx!.name,
      sourceData: this.dragStartCtx!.data,
      sourceName: this.dragStartCtx!.name,
      sourceDataset: sourceDataset
    })
  }

  endDragInternal(grabCtx: grabContext<any, any>): unknown[] {
    let mapping = this.mappings.find(m => m.sourceName === grabCtx.sourceName && m.targetName === grabCtx.targetName);
    let mappedData = mapping!.grabFn(grabCtx);
    this.dragStartCtx = undefined;
    this.dragEndCtx = undefined;
    return mappedData;
  }

  canDrop(tableName: string, $event: DragEvent): boolean {
    const canDrop = this.canDropStorage.get(this.dragStartCtx!.name)?.has(tableName) ?? false;
    if (canDrop) {
      $event.preventDefault();
    }
    return canDrop;
  }

  onDrop(targetDataset: unknown[], targetName: string, targetData: any): unknown[] {
    return this.onDropInternal({
      sourceName: this.dragStartCtx!.name,
      sourceData: this.dragStartCtx!.data,
      targetName: targetName,
      targetData: targetData,
      targetDataset: targetDataset
    })
  }

  onDropInternal(dropCtx: DropContext<any, any>): unknown[] {
    let mapping = this.mappings.find(m => m.sourceName === dropCtx.sourceName && m.targetName === dropCtx.targetName);
    let mappedData = mapping!.dropFn(dropCtx);
    this.dragEndCtx = {
      name: dropCtx.targetName,
      data: dropCtx.targetData
    }
    return mappedData;
  }

  get draggableTableNames(): string[] {
    return this.mappings?.map(mapping => mapping.sourceName) || [];
  }

  getPreviewComponent(name: string): (new () => AurDragPreviewComponent<any>) | undefined {
    return this.mappings.find(value => value.sourceName === name)?.preview || undefined;
  }

  public static empty(): AurDragDropManager {
    // @ts-ignore
    return new AurDragDropManager(undefined, []);
  }

  private showDragPreview(name: string, event: DragEvent, data: any) {
    let previewConstructor = this.getPreviewComponent(name);
    if (previewConstructor) {
      // Динамически создаем компонент превью
      this.currentPreviewComponentRef = this.viewContainerRef.createComponent(previewConstructor);
      this.currentPreviewComponentRef.instance.data = data;

      const nativePreview = this.currentPreviewComponentRef.location.nativeElement;

      // Применение необходимых стилей к элементу превью
      nativePreview.style.position = 'absolute';
      nativePreview.style.top = '0';
      nativePreview.style.left = '-9999px'; // Скрыть элемент за пределами экрана
      document.body.appendChild(nativePreview); // Временно добавляем в DOM для отображения

      event.dataTransfer?.setDragImage(nativePreview, 0, 0);
    }
  }

  private removeDragPreview() {
    if (this.currentPreviewComponentRef) {
      document.body.removeChild(this.currentPreviewComponentRef.location.nativeElement);
      this.currentPreviewComponentRef.destroy();
      this.currentPreviewComponentRef = undefined;
    }
  }
}


