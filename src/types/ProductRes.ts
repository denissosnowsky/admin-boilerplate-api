import { S3 } from "aws-sdk";

import { Product } from "../models";

export type ProductRes = Omit<Product, 'previewImage'> & {previewImage: S3.Body | undefined};