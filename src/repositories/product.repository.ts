import {inject} from '@loopback/core';
import {
  AnyObject,
  DataObject,
  DefaultCrudRepository,
  Filter,
  FilterExcludingWhere,
} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {Product, ProductRelations} from '../models';
import {StorageRepository} from './storage.repository';
import S3, {ManagedUpload} from 'aws-sdk/clients/s3';
import {ProductRes} from '../types/ProductRes';

export class ProductRepository extends DefaultCrudRepository<
  Product,
  typeof Product.prototype.id,
  ProductRelations
> {
  private storageRepository: StorageRepository;

  constructor(@inject('datasources.mongo') dataSource: MongoDataSource) {
    super(Product, dataSource);
    this.storageRepository = new StorageRepository();
  }

  async createProduct(
    entity: DataObject<
      Omit<Product, 'previewImage'> & {previewImage?: Express.Multer.File[]}
    >,
    options?: AnyObject | undefined,
  ): Promise<ProductRes> {
    let images: ManagedUpload.SendData[] | null = null;

    if (entity.previewImage?.length) {
      images = await this.storageRepository.upload(
        entity.previewImage as Express.Multer.File[],
      );
    }

    const createdProduct = await super.create(
      {...entity, previewImage: images ? images[0].Key : ''},
      options,
    );

    return {
      ...createdProduct,
      previewImage: await this.defineImage(createdProduct.previewImage),
    };
  }

  async findProducts(
    filter?: Filter<Product> | undefined,
    options?: AnyObject | undefined,
  ): Promise<ProductRes[]> {
    const products = await super.find(filter, options);

    return await Promise.all(
      products.map(async product => ({
        ...product,
        previewImage: await this.defineImage(product.previewImage),
      })),
    );
  }

  async replaceProductById(
    id: string,
    data: DataObject<
      Omit<Product, 'previewImage'> & {previewImage?: Express.Multer.File[]}
    >,
    options?: AnyObject | undefined,
  ): Promise<void> {
    let images: ManagedUpload.SendData[] | null = null;

    const imageFromMongoDB = await super.findById(id);

    if (data.previewImage?.length) {
      images = await this.storageRepository.upload(
        data.previewImage as Express.Multer.File[],
      );

      if (imageFromMongoDB.previewImage) {
        await this.storageRepository.removeImage(imageFromMongoDB.previewImage);
      }
    }

    await super.replaceById(
      id,
      {
        ...data,
        previewImage: images ? images[0].Key : imageFromMongoDB.previewImage,
      },
      options,
    );
  }

  async findProductById(
    id: string,
    filter?: FilterExcludingWhere<Product> | undefined,
    options?: AnyObject | undefined,
  ): Promise<ProductRes> {
    const productFromMongoDB = await super.findById(id, filter, options);

    return {
      ...productFromMongoDB,
      previewImage: await this.defineImage(productFromMongoDB.previewImage),
    };
  }

  async findVisibleProducts(
    filter?: Filter<Product> | undefined,
    options?: AnyObject | undefined,
  ) {
    const filterVisibleOnly: Filter<Product> = {
      where: {hidden: {neq: true}},
    };

    const products = await super.find(
      filter ? {...filterVisibleOnly, ...filter} : filterVisibleOnly,
      options,
    );

    return await Promise.all(
      products.map(async product => ({
        ...product,
        previewImage: await this.defineImage(product.previewImage),
      })),
    );
  }

  private async defineImage(
    previewImage?: string,
  ): Promise<S3.Body | undefined> {
    let image = undefined;

    if (previewImage) {
      try {
        image = (await this.storageRepository.getImage(previewImage)).Body;
      } catch {
        image = undefined;
      }
    }

    return image;
  }
}
