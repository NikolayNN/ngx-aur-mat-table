export interface AurDragDropMapping<SOURCE, TARGET> {
  readonly sourceName: string,
  readonly targetName: string,
  readonly grabFn: (ctx: grabContext<SOURCE, TARGET>) => SOURCE[]
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

  public static empty(): AurDragDropManager {
    return new AurDragDropManager([]);
  }
}


