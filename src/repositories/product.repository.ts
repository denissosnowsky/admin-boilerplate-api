import {inject} from '@loopback/core';
import {
  AnyObject,
  DataObject,
  DefaultCrudRepository,
  Filter,
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
      Omit<Product, 'previewImage'> & {previewImage: Express.Multer.File[]}
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

    const createdProductWithImage = {
      ...createdProduct,
      previewImage: await this.defineImage(createdProduct.previewImage),
    };

    return createdProductWithImage;
  }

  async findProducts(
    filter?: Filter<Product> | undefined,
    options?: AnyObject | undefined,
  ): Promise<ProductRes[]> {
    const products = await super.find(filter, options);

    const porductsWithImages = await Promise.all(
      products.map(async product => ({
        ...product,
        previewImage: await this.defineImage(product.previewImage),
      })),
    );

    return porductsWithImages;
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
