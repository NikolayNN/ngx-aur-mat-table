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
  readonly dropFn: (ctx: DropContext<SOURCE, TARGET>) => TARGET[]
}

interface DragStartContext {
  readonly name: string,
  readonly data: any
}

export interface grabContext<SOURCE, TARGET> {
  readonly sourceName: string,
  readonly sourceData: SOURCE,
  readonly sourceDataset: SOURCE[],

  readonly targetName: string,
  readonly targetData: TARGET,
}

export interface DropContext<SOURCE, TARGET> {
  readonly sourceName: string,
  readonly sourceData: SOURCE,

  readonly targetDataset: TARGET[],
  readonly targetName: string,
  readonly targetData: TARGET,
}

export class AurDragDropManager {

  private dragStartCtx: DragStartContext | undefined;
  private dragEndCtx: DragStartContext | undefined;

  //can drop [key from table, value to table name]
  private canDropStorage = new Map<string, Set<string>>();

  constructor(private mappings: AurDragDropMapping<any, any>[]) {
    this.mappings.forEach(m => {
      this.canDropStorage.set(m.sourceName, new Set());
    });
    this.mappings.forEach(m => {
      this.canDropStorage.get(m.sourceName)!.add(m.targetName);
    })
  }

  startDrag(targetName: string, data: any) {
    this.dragStartCtx = {name: targetName, data: data}
  }

  endDrag(sourceDataset: any[]): any[] {
    return this.endDragInternal({
      targetData: this.dragEndCtx!.data,
      targetName: this.dragEndCtx!.name,
      sourceData: this.dragStartCtx!.data,
      sourceName: this.dragStartCtx!.name,
      sourceDataset: sourceDataset
    })
  }

  endDragInternal(grabCtx: grabContext<any, any>): any[] {
    let mapping = this.mappings.find(m => m.sourceName === grabCtx.sourceName && m.targetName === grabCtx.targetName);
    let mappedData = mapping!.grabFn(grabCtx);
    this.dragStartCtx = undefined;
    this.dragEndCtx = undefined;
    return mappedData;
  }

  canDrop(tableName: string, $event: DragEvent) {
    if (this.canDropStorage.get(this.dragStartCtx!.name)?.has(tableName) ?? false) {
      $event.preventDefault();
    }
  }

  onDrop(targetDataset: any[], targetName: string, targetData: any): any[] {
    return this.onDropInternal({
      sourceName: this.dragStartCtx!.name,
      sourceData: this.dragStartCtx!.data,
      targetName: targetName,
      targetData: targetData,
      targetDataset: targetDataset
    })
  }

  onDropInternal(dropCtx: DropContext<any, any>): any[] {
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

  public static empty(): AurDragDropManager {
    return new AurDragDropManager([]);
  }
}


