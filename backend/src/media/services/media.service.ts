import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { In, Repository } from 'typeorm';
import { MediaObject } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { AuthUser } from '../../common/decorators';
import { MediaKind } from '../../common/auth.types';
import { uuid } from '../../common/util/tokens';
import { MediaRequestDto } from '../dto/media.dto';

/** §8.2 upload policy: per-kind byte cap + mime allowlist. */
const MIME_RULES: Record<MediaKind, (mime: string) => boolean> = {
  image: (m) => /^image\/(jpeg|pjpeg|png|webp|gif)$/.test(m),
  avatar: (m) => /^image\//.test(m),
  attachment: (m) =>
    /^(application\/(pdf|msword|zip|json|vnd\.openxmlformats-officedocument\..+)|text\/plain)$/.test(m),
};

/**
 * §8 media & uploads. Preferred path is a presigned S3 PUT; this driver is the
 * documented local fallback (§8.1 / README): `POST /media` mints a metadata row
 * and a `upload_url` pointing back at `PUT /media/:id/content`, which writes the
 * bytes under `MEDIA_DIR`. `sha256` dedupe reuses an existing object key so an
 * identical blob is not stored twice.
 */
@Injectable()
export class MediaService {
  private readonly dir: string;
  private readonly caps: Record<MediaKind, number>;
  private readonly signedTtlSec: number;

  constructor(
    @InjectRepository(MediaObject) private readonly media: Repository<MediaObject>,
    config: ConfigService,
  ) {
    this.dir = config.get<string>('media.dir') ?? './uploads';
    this.caps = {
      image: config.get<number>('media.maxImageBytes') ?? 10 * 1024 * 1024,
      avatar: config.get<number>('media.maxAvatarBytes') ?? 5 * 1024 * 1024,
      attachment: config.get<number>('media.maxAttachmentBytes') ?? 25 * 1024 * 1024,
    };
    this.signedTtlSec = config.get<number>('media.signedTtlSec') ?? 900;
  }

  // ------------------------------------------------------------- request ----

  async requestUpload(user: AuthUser, dto: MediaRequestDto) {
    this.assertPolicy(dto.kind, dto.mime_type, dto.size_bytes);
    const sha = dto.sha256?.toLowerCase() ?? '';

    // Dedupe: reuse a live object key for an identical digest.
    let storageKey: string;
    const twin = sha ? await this.media.findOne({ where: { sha256: sha } }) : null;
    if (twin) storageKey = twin.storage_key;
    else storageKey = `${dto.kind}/${uuid()}-${this.safeName(dto.file_name)}`;

    const saved = await this.media.save(
      this.media.create({
        owner_id: user.id,
        kind: dto.kind,
        storage_key: storageKey,
        file_name: dto.file_name,
        mime_type: dto.mime_type,
        size_bytes: String(dto.size_bytes),
        sha256: sha,
      }),
    );

    return {
      media_id: saved.id,
      upload_url: `/api/v1/media/${saved.id}/content`,
      expires_at: new Date(Date.now() + this.signedTtlSec * 1000).toISOString(),
    };
  }

  // --------------------------------------------------------- write bytes ----

  async saveContent(user: AuthUser, id: string, buffer: Buffer) {
    const m = await this.load(id);
    if (m.owner_id !== user.id && !user.is_admin) throw ApiException.permissionDenied('You do not own this media');
    if (buffer.length === 0) throw ApiException.validationFailed([{ field: 'body', message: 'empty upload body' }]);
    this.assertPolicy(m.kind, m.mime_type, buffer.length);
    await this.writeObject(m.storage_key, buffer);
    m.size_bytes = String(buffer.length);
    await this.media.save(m);
    return this.view(m);
  }

  // ------------------------------------------------------------- read ------

  async getMedia(_user: AuthUser | null, id: string) {
    return this.view(await this.load(id));
  }

  async serve(id: string, thumb = false): Promise<{ buffer: Buffer; mime: string }> {
    const m = await this.load(id);
    const key = thumb ? m.thumbnail_key : m.storage_key;
    if (!key) throw ApiException.notFound('Media variant not found');
    try {
      const buffer = await fs.readFile(this.absPath(key));
      return { buffer, mime: thumb ? 'image/webp' : m.mime_type };
    } catch {
      throw ApiException.notFound('Media file not found');
    }
  }

  // ------------------------------------------------------------- helpers ----

  /** Ownership probe used by content modules that link `media_id`s (§8.1). */
  async ownedBy(userId: string, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.media.find({ where: { owner_id: userId, id: In(ids.map(String)) } });
    return new Set(rows.map((r) => r.id));
  }

  private async load(id: string): Promise<MediaObject> {
    const m = await this.media.findOne({ where: { id } });
    if (!m) throw ApiException.notFound('Media not found');
    return m;
  }

  private assertPolicy(kind: MediaKind, mime: string, sizeBytes: number) {
    if (!MIME_RULES[kind](mime)) {
      throw ApiException.validationFailed([{ field: 'mime_type', message: `mime_type not allowed for kind '${kind}'` }]);
    }
    const cap = this.caps[kind];
    if (sizeBytes > cap) {
      throw ApiException.validationFailed([{ field: 'size_bytes', message: `exceeds ${cap} bytes for kind '${kind}'` }]);
    }
  }

  private absPath(storageKey: string): string {
    // storageKey is server-generated (kind/uuid-name); resolve defensively.
    const resolved = path.resolve(this.dir, storageKey);
    if (!resolved.startsWith(path.resolve(this.dir))) throw ApiException.notFound('Media file not found');
    return resolved;
  }

  private async writeObject(storageKey: string, buffer: Buffer): Promise<void> {
    const abs = this.absPath(storageKey);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buffer);
  }

  private safeName(name: string): string {
    const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
    return base.slice(0, 120) || 'file';
  }

  private view(m: MediaObject) {
    return {
      id: m.id,
      kind: m.kind,
      url: m.url,
      thumbnail_url: m.thumbnail_url,
      file_name: m.file_name,
      mime_type: m.mime_type,
      size_bytes: Number(m.size_bytes),
      width: m.width,
      height: m.height,
    };
  }
}
