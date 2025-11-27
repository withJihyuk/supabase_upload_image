import { PutObjectCommand } from '@aws-sdk/client-s3';
import { HttpException, Injectable } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { S3Service } from 'src/s3/s3.service';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class ImageService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly s3Service: S3Service,
  ) {}

  async uploadMultipleImages(
    req: Request,
    files: Express.Multer.File[],
  ): Promise<string[]> {
    try {
      const token = (req.headers as any).authorization?.split('Bearer ')[1];
      if (!token) {
        throw new HttpException('인증 토큰이 없습니다.', 401);
      }

      const result = await this.supabaseService.getClient().auth.getUser(token);
      if (result.error || !result.data.user) {
        throw new HttpException('인증되지 않은 사용자입니다.', 401);
      }

      const userId = result.data.user.id;
      const filesArray = Array.from(files || []);

      if (filesArray.length === 0) {
        throw new HttpException('업로드할 파일이 없습니다.', 400);
      }

      const fileIds: string[] = [];
      const supabaseInsertData: { user_id: string; id: string }[] = [];

      for (const file of filesArray) {
        if (!file || !file.buffer) {
          console.warn('유효하지 않은 파일이 발견되었습니다. 건너뜁니다.');
          continue;
        }

        const fileId = randomUUID();
        fileIds.push(fileId);

        const command = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileId,
          Body: file.buffer,
          ContentType: file.mimetype || 'image/jpeg',
        });

        try {
          await this.s3Service.getClient().send(command);
        } catch (uploadError) {
          throw new HttpException('이미지 업로드에 실패했습니다.', 500);
        }
      }

      return fileIds;
    } catch (error) {
      console.error('이미지 업로드 중 오류 발생:', error);
      throw new HttpException('이미지 업로드에 실패했습니다.', 500);
    }
  }
}
