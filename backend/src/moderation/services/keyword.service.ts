import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Keyword } from '../../entities';
import { KeywordAction } from '../../common/auth.types';

export interface ScanResult {
  /** Highest-severity action found: block wins over manual_review. */
  action: KeywordAction | null;
  /** The offending word (echoed in the 422 details / audit). */
  word: string | null;
}

/**
 * §6.12 keyword dictionary driving the pre-publish filter (§7). The enabled set
 * is cached in-memory (60 s TTL, invalidated on any admin write) so the hot
 * write path scans a local list instead of hitting the DB every submit — the
 * Redis-backed variant slots in behind the same interface (§10.1).
 */
@Injectable()
export class KeywordService {
  private cache: Keyword[] | null = null;
  private cachedAt = 0;
  private static readonly TTL_MS = 60_000;

  constructor(@InjectRepository(Keyword) private readonly repo: Repository<Keyword>) {}

  private async enabled(): Promise<Keyword[]> {
    if (this.cache && Date.now() - this.cachedAt < KeywordService.TTL_MS) return this.cache;
    this.cache = await this.repo.find({ where: { enabled: true } });
    this.cachedAt = Date.now();
    return this.cache;
  }

  /** Scan several text fields at once; block outranks manual_review. */
  async scan(...fields: Array<string | null | undefined>): Promise<ScanResult> {
    const haystack = fields.filter(Boolean).join('\n').toLowerCase();
    if (!haystack.trim()) return { action: null, word: null };
    const keywords = await this.enabled();
    let manual: string | null = null;
    for (const k of keywords) {
      if (!k.word || !haystack.includes(k.word.toLowerCase())) continue;
      if (k.action === 'block') return { action: 'block', word: k.word };
      if (!manual) manual = k.word;
    }
    return manual ? { action: 'manual_review', word: manual } : { action: null, word: null };
  }

  invalidate(): void {
    this.cache = null;
    this.cachedAt = 0;
  }

  // ---- admin CRUD (used by §6.17 /admin/keywords, wired in the admin tranche) ----

  list(): Promise<Keyword[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  async create(input: { word: string; action: KeywordAction; created_by: string }): Promise<Keyword> {
    const row = await this.repo.save(this.repo.create({ word: input.word, action: input.action, enabled: true, created_by: input.created_by }));
    this.invalidate();
    return row;
  }

  async update(id: string, patch: { action?: KeywordAction; enabled?: boolean }): Promise<Keyword | null> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) return null;
    if (patch.action !== undefined) row.action = patch.action;
    if (patch.enabled !== undefined) row.enabled = patch.enabled;
    await this.repo.save(row);
    this.invalidate();
    return row;
  }

  async remove(id: string): Promise<boolean> {
    const res = await this.repo.delete({ id });
    this.invalidate();
    return (res.affected ?? 0) > 0;
  }
}
