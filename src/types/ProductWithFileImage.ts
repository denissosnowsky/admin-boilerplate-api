import {Product} from '../models';

export type ProductWithFileImage = Omit<Product, 'previewImage'> & {
  previewImage: Express.Multer.File[] | undefined;
};
