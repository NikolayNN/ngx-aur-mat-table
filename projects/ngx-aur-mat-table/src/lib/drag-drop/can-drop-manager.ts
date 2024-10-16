import {AurDragDropMapping} from "./model/aur-drag-drop-mapping";


export class CanDropManager {

  //can drop [key from table, value to table name]
  private canDropStorage = new Map<string, Set<string>>();

  constructor(mappings: AurDragDropMapping<any, any>[]) {
    this.fillStorage(mappings);
  }

  private fillStorage(mappings: AurDragDropMapping<any, any>[]) {
    mappings.forEach(m => {
      if (!this.canDropStorage.has(m.sourceName)) {
        this.canDropStorage.set(m.sourceName, new Set());
      }
      this.canDropStorage.get(m.sourceName)!.add(m.targetName);
    });
  }

  public canDrop(sourceName: string | undefined, targetName: string | undefined): boolean {
    if (!sourceName || !targetName) {
      return false;
    }
    return this.canDropStorage.get(sourceName)?.has(targetName) ?? false;
  }

  public dropPreventDefault(sourceName: string | undefined, targetName: string, $event: DragEvent): boolean {
    const canDrop = this.canDrop(sourceName, targetName);
    if (canDrop) {
      $event.preventDefault();
    }
    return canDrop;
  }
}
