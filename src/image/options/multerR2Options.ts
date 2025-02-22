import { HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { FileFilterCallback } from 'multer';

export const multerR2Options = {
  fileFilter: (
    request: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
  ) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
      callback(null, true);
    } else {
      const errorMessage = `지원하지 않는 이미지 형식입니다. (Status: ${HttpStatus.BAD_REQUEST})`;
      // @ts-ignore
      callback(errorMessage, false);
    }
  },
  limits: {
    fieldNameSize: 200,
    filedSize: 10 * 1024 * 1024,
    fields: 2,
    fileSize: 16777216,
    files: 10,
  },
};
