export class BasicCache {
  public async get(key: any): Promise<any> {
    throw new Error(`Not implemented`);
  }

  public async set(key: any, value: any, ttl = 3600 * 1000) {
    throw new Error(`Not implemented`);
  }

  public async delete(key: any) {
    throw new Error(`Not implemented`);
  }

  public async cleanup() {}
}
