import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ImageService } from './image.service';
import { multerR2Options } from './options/multerR2Options';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('image')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', multerR2Options))
  async create(
    @UploadedFile() file: Express.Multer.File[],
    @Req() req: Request,
  ): Promise<string[]> {
    return await this.imageService.uploadMultipleImages(req, file);
  }
}
