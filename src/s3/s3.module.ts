import { S3Client } from '@aws-sdk/client-s3';
import { Global, Module } from '@nestjs/common';
import { S3Service } from './s3.service';

@Global()
@Module({
  providers: [
    {
      provide: 'S3_CLIENT',
      useFactory: () => {
        return new S3Client({
          region: 'auto',
          endpoint: process.env.R2_ENDPOINT,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
          },
        });
      },
    },
    S3Service,
  ],
  exports: [S3Service],
})
export class S3Module {}
