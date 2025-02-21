import { S3Client } from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class S3Service {
  constructor(
    @Inject('S3_CLIENT')
    private s3Client: S3Client,
  ) {}
  getClient() {
    return this.s3Client;
  }
}
