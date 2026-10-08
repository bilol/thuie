import { Body, Controller, Get, Param, Post, Put, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MediaService } from '../services/media.service';
import { AuthUser, CurrentUser, Public } from '../../common/decorators';
import { MediaRequestDto } from '../dto/media.dto';

/**
 * §8 media & uploads. `POST /media` mints the row + upload target; the client
 * then `PUT`s bytes to `/media/:id/content` (local fallback for the presigned
 * PUT). Bytes come from `req.rawBody` (raw parser registered in main.ts for the
 * upload mime types; `req.body` Buffer as fallback). The file itself
 * is served from `GET /media/:id/:name` and `GET /media/:id/thumb`, which are
 * `@Public()` so `<img>` tags load without a bearer token.
 */
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  request(@CurrentUser() user: AuthUser, @Body() dto: MediaRequestDto) {
    return this.media.requestUpload(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.media.getMedia(user, id);
  }

  @Put(':id/content')
  putContent(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
    const buffer = raw ?? (Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0));
    return this.media.saveContent(user, id, buffer);
  }

  @Public()
  @Get(':id/thumb')
  async thumb(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { buffer, mime } = await this.media.serve(id, true);
    res.setHeader('Content-Type', mime);
    return buffer;
  }

  @Public()
  @Get(':id/:name')
  async file(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { buffer, mime } = await this.media.serve(id, false);
    res.setHeader('Content-Type', mime);
    return buffer;
  }
}
