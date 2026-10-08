import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModerationAction } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { ContentStatus, ModerationTargetType } from '../../common/auth.types';
import { KeywordService } from './keyword.service';

type ModerationActionKind = 'submitted' | 'approved' | 'rejected' | 'taken_down' | 'removed' | 'resubmitted';

/**
 * BACKEND.md §7 — the one moderation write path. Nothing persists user content
 * without going through `scan()` → entity-save → `record('submitted')`, so the
 * keyword engine, the lifecycle audit (`moderation_actions`) and the status
 * transitions can never drift apart between infos / forum / profiles.
 */
@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ModerationAction) private readonly actions: Repository<ModerationAction>,
    private readonly keywords: KeywordService,
  ) {}

  /**
   * Run the keyword pre-filter over the author's text. Returns the status the
   * row should be persisted with, or throws `keyword_blocked` (422) for a hard
   * block — the caller must not persist a blocked submission (§7).
   */
  async scan(textFields: Array<string | null | undefined>): Promise<ContentStatus> {
    const result = await this.keywords.scan(...textFields);
    if (result.action === 'block') throw ApiException.keywordBlocked(result.word ?? '');
    // manual_review ⇒ pending for human eyes; a clean scan auto-publishes (§7).
    return result.action === 'manual_review' ? 'pending' : 'approved';
  }

  /** Append a lifecycle audit row. `actorId` NULL ⇒ system / keyword engine. */
  async record(input: {
    targetType: ModerationTargetType;
    targetId: string;
    action: ModerationActionKind;
    actorId?: string | null;
    reason?: string | null;
  }): Promise<ModerationAction> {
    return this.actions.save(
      this.actions.create({
        target_type: input.targetType,
        target_id: input.targetId,
        actor_id: input.actorId ?? null,
        action: input.action,
        reason: input.reason ?? null,
      }),
    );
  }

  /** Moderation timeline, newest first (author detail + §6.17 admin history). */
  history(targetType: ModerationTargetType, targetId: string): Promise<ModerationAction[]> {
    return this.actions.find({
      where: { target_type: targetType, target_id: targetId },
      order: { created_at: 'DESC' },
    });
  }
}
