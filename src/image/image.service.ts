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
      const result: { data: { user: User | null }; error: any } =
        await this.supabaseService
          .getClient()
          .auth.getUser((req.headers as any).authorization.split('Bearer ')[1]);
      if (result.error || !result.data.user) {
        throw new HttpException('Unauthorized', 401);
      }

      const fileIds: string[] = [];
      const supabaseInsertData: { user_id: string; id: string }[] = [];

      const uploadPromises = files.map(async (file) => {
        const fileId = randomUUID();
        fileIds.push(fileId);

        const command = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileId,
          Body: file.buffer,
          ContentType: file.mimetype || 'image/jpg',
        });

        await this.s3Service.getClient().send(command);

        supabaseInsertData.push({
          user_id: result.data.user!.id,
          id: fileId,
        });
      });

      await Promise.all(uploadPromises);

      if (supabaseInsertData.length > 0) {
        await this.supabaseService
          .getClient()
          .from('images')
          .insert(supabaseInsertData);
      }

      return fileIds;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('이미지 업로드에 실패 했습니다.', 500);
    }
  }
}
