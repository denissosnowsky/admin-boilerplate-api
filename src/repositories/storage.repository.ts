import {StorageDataSource} from '../datasources';

export class StorageRepository {
  private dataSource: StorageDataSource;

  constructor() {
    this.dataSource = new StorageDataSource();
  }

  async upload(files: Express.Multer.File[]) {
    return this.dataSource.upload(files);
  }

  async getImage(key: string): Promise<AWS.S3.GetObjectOutput> {
    return this.dataSource.getImage(key);
  }
}
