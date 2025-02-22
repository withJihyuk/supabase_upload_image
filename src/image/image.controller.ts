import {
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ImageService } from './image.service';
import { multerR2Options } from './options/multerR2Options';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('image')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, multerR2Options))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ): Promise<string[]> {
    return await this.imageService.uploadMultipleImages(req, files);
  }
}
