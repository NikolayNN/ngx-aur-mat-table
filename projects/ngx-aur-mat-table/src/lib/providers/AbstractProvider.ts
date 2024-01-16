export class AbstractProvider {

  protected hasKey(key: string, keys: string[]): boolean {
    return keys.some(k => k === key);
  }

  protected notHasKey(key: string, keys: string[]): boolean {
    return !this.hasKey(key, keys);
  }
}
