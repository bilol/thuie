import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PostTag, Tag } from '../../entities';

/**
 * §6.7 tags — the controlled vocabulary behind forum threads. Post create/edit
 * upserts tags by slug (a name we've never seen becomes a new row), so the
 * dictionary grows from usage instead of a fixed seed.
 */
@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag) private readonly tags: Repository<Tag>,
    @InjectRepository(PostTag) private readonly postTags: Repository<PostTag>,
  ) {}

  list(): Promise<Tag[]> {
    return this.tags.find({ order: { name: 'ASC' } });
  }

  /** Resolve a mixed list of names/slugs to Tag rows, creating misses. */
  async resolve(refs: string[]): Promise<Tag[]> {
    const cleaned = [...new Set(refs.map((r) => r.trim()).filter(Boolean))].slice(0, 10);
    if (cleaned.length === 0) return [];
    const slugs = cleaned.map((c) => Tag.slugify(c));
    const found = await this.tags.find({ where: [{ slug: In(slugs) }, { name: In(cleaned) }] });

    const out: Tag[] = [];
    for (const ref of cleaned) {
      const slug = Tag.slugify(ref);
      const hit = found.find((t) => t.slug === slug || t.name === ref);
      if (hit) {
        if (!out.some((t) => t.id === hit.id)) out.push(hit);
      } else {
        const created = await this.tags.save(this.tags.create({ name: ref, slug }));
        out.push(created);
      }
    }
    return out;
  }

  /** Replace a post's tag set (idempotent full-list write, §6.7). */
  async setForPost(postId: string, refs: string[]): Promise<Tag[]> {
    const resolved = await this.resolve(refs);
    await this.postTags.delete({ post_id: postId });
    if (resolved.length) {
      await this.postTags.save(resolved.map((t) => this.postTags.create({ post_id: postId, tag_id: t.id })));
    }
    return resolved;
  }

  async tagsForPost(postId: string): Promise<Tag[]> {
    const links = await this.postTags.find({ where: { post_id: postId }, relations: { tag: true } });
    return links.map((l) => l.tag).filter(Boolean);
  }

  /** Post ids carrying a given tag slug (used by the feed filter). */
  async postIdsBySlug(slug: string): Promise<string[]> {
    const links = await this.postTags
      .createQueryBuilder('pt')
      .innerJoin('pt.tag', 'tag')
      .where('tag.slug = :slug', { slug })
      .select('pt.post_id', 'post_id')
      .getRawMany<{ post_id: string }>();
    return links.map((l) => l.post_id);
  }
}
