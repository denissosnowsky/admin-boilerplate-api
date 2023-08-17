import AWS from 'aws-sdk';
import {v4 as uuidv4} from 'uuid';
import {Duplex} from 'stream';

const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

const BUCKET = process.env.BUCKET!;

export class StorageDataSource {
  async upload(files: Express.Multer.File[]) {
    const res: AWS.S3.ManagedUpload.SendData[] = [];

    for (const file of files) {
      const params = {
        Bucket: BUCKET,
        Key: `${uuidv4()}${file.originalname}`,
        Body: this.bufferToStream(file.buffer),
      };
      try {
        const stored = await s3.upload(params).promise();
        res.push(stored);
      } catch (err) {
        throw new Error();
      }
    }

    return res;
  }

  async getImage(key: string): Promise<AWS.S3.GetObjectOutput> {
    const params = {Bucket: BUCKET, Key: key};

    return new Promise((resolve, reject) => {
      s3.getObject(params, function (err, data) {
        if (err) reject(err);

        resolve(data);
      });
    });
  }

  private bufferToStream(buffer: Buffer) {
    const duplexStream = new Duplex();
    duplexStream.push(buffer);
    duplexStream.push(null);
    return duplexStream;
  }
}
