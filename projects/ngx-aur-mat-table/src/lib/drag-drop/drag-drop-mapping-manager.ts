import {AurDragDropMapping} from "./model/aur-drag-drop-mapping";


export class DragDropMappingManager {

  private readonly mappingsStorage = new Map<string, AurDragDropMapping<any, any>>();

  constructor(mappings: AurDragDropMapping<any, any>[]) {
    this.fillStorage(mappings);
  }

  public get(sourceName: string, targetName: string): AurDragDropMapping<any, any> {
    const mapping = this.mappingsStorage.get(this.buildKey(sourceName, targetName));
    if (!mapping) {
      throw new Error(`Mapping for ${sourceName} -> ${targetName} was not found`)
    }
    return mapping;
  }

  private fillStorage(mappings: AurDragDropMapping<any, any>[]) {
    mappings.forEach(mapping => {
      const key = this.buildKeyForMapping(mapping);
      if (this.mappingsStorage.has(key)) {
        console.log(`WARN: duplicate drag drop mapping: ${key}`);
      }
      this.mappingsStorage.set(key, mapping)
    });
  }

  private buildKeyForMapping(mapping: AurDragDropMapping<any, any>): string {
    return this.buildKey(mapping.sourceName, mapping.targetName);
  }

  private buildKey(sourceName: string, targetName: string): string {
    return `${sourceName}->${targetName}`;
  }
}
