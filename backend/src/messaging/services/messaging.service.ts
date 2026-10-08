import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ChatMessage, Conversation, ConversationParticipant, User } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { AuthUser } from '../../common/decorators';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage } from '../../common/pagination/page';
import { ConnectionsService } from '../../connections/services/connections.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { CreateConversationDto, SendMessageDto, UpdateConversationDto } from '../dto/conversation.dto';

/**
 * §6.8 messaging (REST source-of-truth write). Direct conversations dedupe on
 * the generated `pair_key` so a double-open is idempotent; read state is
 * per-participant (`last_read_at`), never a boolean. Blocks (§12.7) forbid a DM
 * in either direction — enforced here and in {@link send}.
 */
@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(ConversationParticipant) private readonly participants: Repository<ConversationParticipant>,
    @InjectRepository(ChatMessage) private readonly messages: Repository<ChatMessage>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly connections: ConnectionsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // ---------------------------------------------------------------- inbox ----

  async inbox(user: AuthUser, query: { cursor?: string; limit?: number }) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.participants
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.conversation', 'c')
      .where('p.user_id = :userId', { userId: user.id })
      .andWhere('c.last_message_at IS NOT NULL')
      .orderBy('COALESCE(c.last_message_at, c.created_at)', 'DESC')
      .addOrderBy('c.id', 'DESC');
    if (cursor?.v) qb.andWhere('COALESCE(c.last_message_at, c.created_at) < :c', { c: new Date(String(cursor.v)) });
    // `.limit` not `.take`: the distinct-ids subquery cannot resolve the raw
    // COALESCE expression used as an order term.
    const parts = await qb.limit(limit + 1).getMany();
    const kept = parts.slice(0, limit);
    const last = kept[kept.length - 1];
    const next = parts.length > limit && last?.conversation ? encodeCursor({ v: (last.conversation.last_message_at ?? last.conversation.created_at).toISOString(), id: last.conversation.id }) : null;

    const data = await Promise.all(
      kept.map(async (p) => {
        const conv = p.conversation;
        const [counterpart, lastMessage, unread, members] = await Promise.all([
          this.counterpart(conv, user.id),
          this.lastMessage(conv.id),
          this.unreadCount(conv.id, user.id, p.last_read_at),
          conv.kind === 'group' ? this.groupMembers(conv.id, user.id) : Promise.resolve([] as User[]),
        ]);
        return this.conversationView(conv, p, counterpart, lastMessage, unread, members);
      }),
    );
    return cursorPage(data, limit, next);
  }

  // ------------------------------------------------------------ create DM ----

  async create(user: AuthUser, dto: CreateConversationDto) {
    const isGroup = Array.isArray(dto.participant_ids) && dto.participant_ids.length > 0;
    const memberIds = isGroup
      ? Array.from(new Set([user.id, ...dto.participant_ids!.map(String)]))
      : dto.participant_id
        ? [user.id, String(dto.participant_id)]
        : null;
    if (!memberIds || memberIds.length < 2) {
      throw ApiException.validationFailed([{ field: 'participant_id', message: 'a conversation needs at least two members' }]);
    }

    if (!isGroup) {
      const other = memberIds.find((id) => id !== user.id)!;
      if (await this.connections.hasBlocked(user.id, other)) throw ApiException.permissionDenied('You have blocked this user');
      if (await this.connections.hasBlocked(other, user.id)) throw ApiException.permissionDenied('Cannot start a conversation with this user');

      // A DM dedupes on pair_key, so this doubles as "open the pair's thread":
      // reuse it when present. When absent we only persist it if there is a
      // first message (web sends one via the draft composer); otherwise we still
      // create it to keep the mobile "open then chat" flow working, and the inbox
      // hides it until it has a message. The web never calls this without content.
      const pairKey = Conversation.pairKey(user.id, other);
      let conv = await this.conversations.findOne({ where: { pair_key: pairKey } });
      if (!conv) {
        conv = await this.conversations.save(
          this.conversations.create({ kind: 'direct', created_by: user.id, pair_key: pairKey }),
        );
        await this.participants.save(memberIds.map((uid) => this.participants.create({ conversation_id: conv!.id, user_id: uid })));
      }
      if (dto.content) await this.send(user, conv.id, { content: dto.content });
      const mePart = await this.participant(conv.id, user.id);
      return this.conversationView(conv, mePart, await this.counterpart(conv, user.id), await this.lastMessage(conv.id), 0);
    }

    // A group is a real container even before its first message, so empty
    // group creation stays allowed.
    const conv = await this.conversations.save(
      this.conversations.create({ kind: 'group', created_by: user.id, pair_key: null }),
    );
    await this.participants.save(memberIds.map((uid) => this.participants.create({ conversation_id: conv.id, user_id: uid })));
    const mePart = await this.participant(conv.id, user.id);
    return this.conversationView(conv, mePart, null, null, 0, await this.groupMembers(conv.id, user.id));
  }

  // ------------------------------------------------------------- messages ----

  async listMessages(user: AuthUser, convId: string, query: { cursor?: string; limit?: number; order?: 'asc' | 'desc' }) {
    await this.ensureMember(convId, user.id);
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const dir = query.order === 'asc' ? 'ASC' : 'DESC';
    const qb = this.messages
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 'sender')
      .leftJoinAndSelect('sender.avatar_media', 'avatar')
      .leftJoinAndSelect('m.media', 'media')
      .where('m.conversation_id = :id', { id: convId });
    if (cursor?.id) qb.andWhere(dir === 'DESC' ? 'm.id < :cid' : 'm.id > :cid', { cid: String(cursor.id) });
    const rows = await qb.orderBy('m.id', dir).take(limit + 1).getMany();
    const kept = rows.slice(0, limit);
    const last = kept[kept.length - 1];
    const next = rows.length > limit && last ? encodeCursor({ id: last.id }) : null;
    return cursorPage(kept.map((m) => this.messageView(m)), limit, next);
  }

  async send(user: AuthUser, convId: string, dto: SendMessageDto) {
    await this.ensureMember(convId, user.id);
    const conv = await this.conversations.findOne({ where: { id: convId } });
    if (!conv) throw ApiException.notFound('Conversation not found');

    if (conv.kind === 'direct') {
      const other = await this.otherUserId(convId, user.id);
      if (other && (await this.connections.hasBlocked(other, user.id))) throw ApiException.permissionDenied('Cannot message this user');
    }

    const saved = await this.messages.save(
      this.messages.create({
        conversation_id: convId,
        sender_id: user.id,
        content: dto.content,
        media_id: dto.media_id ?? null,
      }),
    );
    await this.conversations.update({ id: convId }, { last_message_at: new Date() });
    const withRelations = await this.messages.findOne({
      where: { id: saved.id },
      relations: { sender: { avatar_media: true }, media: true },
    });
    const view = this.messageView(withRelations!);
    this.realtime.emitMessageNew(convId, view);
    return view;
  }

  // ------------------------------------------------------------ receipts ----

  /** Soft delete of one's own message: the row stays, the content is hidden. */
  async deleteMessage(user: AuthUser, convId: string, messageId: string) {
    await this.ensureMember(convId, user.id);
    const m = await this.messages.findOne({ where: { id: messageId, conversation_id: convId } });
    if (!m) throw ApiException.notFound('Message not found');
    if (m.sender_id !== user.id) throw ApiException.permissionDenied('Can only delete your own messages');
    m.deleted_at = m.deleted_at ?? new Date();
    await this.messages.save(m);
    return { deleted: true, id: m.id };
  }

  async markRead(user: AuthUser, convId: string, at?: string) {
    const p = await this.ensureMember(convId, user.id);
    p.last_read_at = at ? new Date(at) : new Date();
    await this.participants.save(p);
    this.realtime.emitMessageRead(convId, { userId: user.id, lastReadAt: p.last_read_at.toISOString() });
    return { read_at: p.last_read_at };
  }

  async updateConversation(user: AuthUser, convId: string, dto: UpdateConversationDto) {
    const p = await this.ensureMember(convId, user.id);
    if (dto.muted !== undefined) p.muted = dto.muted;
    if (dto.pinned !== undefined) p.pinned = dto.pinned;
    await this.participants.save(p);
    return { muted: p.muted, pinned: p.pinned };
  }

  // -------------------------------------------------------- group roster ----

  async addParticipants(user: AuthUser, convId: string, ids: string[]) {
    const conv = await this.loadConversation(convId);
    await this.ensureManager(user, conv);
    if (conv.kind !== 'group') throw ApiException.conflict('Only group conversations can add members', 'not_group');
    const added: string[] = [];
    for (const raw of ids.map(String)) {
      if (!raw) continue;
      const exists = await this.participants.findOne({ where: { conversation_id: convId, user_id: raw } });
      if (!exists) {
        await this.participants.save(this.participants.create({ conversation_id: convId, user_id: raw }));
        added.push(raw);
      }
    }
    return { added };
  }

  async removeParticipant(user: AuthUser, convId: string, targetUserId: string) {
    const conv = await this.loadConversation(convId);
    await this.ensureManager(user, conv);
    if (conv.kind !== 'group') throw ApiException.conflict('Only group conversations can remove members', 'not_group');
    await this.participants.delete({ conversation_id: convId, user_id: String(targetUserId) });
    return { removed: true };
  }

  async leave(user: AuthUser, convId: string) {
    await this.ensureMember(convId, user.id);
    await this.participants.delete({ conversation_id: convId, user_id: user.id });
    return { left: true };
  }

  // ---------------------------------------------------------------- helpers --

  private async loadConversation(id: string): Promise<Conversation> {
    const c = await this.conversations.findOne({ where: { id }, relations: { creator: true } });
    if (!c) throw ApiException.notFound('Conversation not found');
    return c;
  }

  private async participant(convId: string, userId: string): Promise<ConversationParticipant> {
    return this.participants.findOne({ where: { conversation_id: convId, user_id: userId } }) as Promise<ConversationParticipant>;
  }

  private async ensureMember(convId: string, userId: string): Promise<ConversationParticipant> {
    const p = await this.participants.findOne({ where: { conversation_id: convId, user_id: userId } });
    if (!p) throw ApiException.notFound('Conversation not found'); // membership failure reads as 404 (§5)
    return p;
  }

  private async ensureManager(user: AuthUser, conv: Conversation) {
    if (user.is_admin || conv.created_by === user.id) return;
    throw ApiException.permissionDenied('Only the group creator or an admin can manage members');
  }

  private async otherUserId(convId: string, userId: string): Promise<string | null> {
    const rows = await this.participants.find({ where: { conversation_id: convId } });
    const other = rows.find((r) => r.user_id !== userId);
    return other?.user_id ?? null;
  }

  private async counterpart(conv: Conversation, viewerId: string): Promise<User | null> {
    if (conv.kind !== 'direct') return null;
    const otherId = await this.otherUserId(conv.id, viewerId);
    if (!otherId) return null;
    return this.users.findOne({ where: { id: otherId }, relations: { avatar_media: true } });
  }

  /** The other members of a group — direct chats surface a single `counterpart`. */
  private async groupMembers(convId: string, viewerId: string): Promise<User[]> {
    const rows = await this.participants.find({ where: { conversation_id: convId } });
    const ids = rows.filter((r) => r.user_id !== viewerId).map((r) => r.user_id);
    if (!ids.length) return [];
    return this.users.find({ where: { id: In(ids) }, relations: { avatar_media: true } });
  }

  private async lastMessage(convId: string): Promise<ChatMessage | null> {
    return this.messages.findOne({ where: { conversation_id: convId }, order: { id: 'DESC' } });
  }

  private async unreadCount(convId: string, userId: string, lastReadAt: Date | null): Promise<number> {
    const qb = this.messages
      .createQueryBuilder('m')
      .where('m.conversation_id = :convId', { convId })
      .andWhere('m.sender_id <> :userId', { userId });
    if (lastReadAt) qb.andWhere('m.sent_at > :lastRead', { lastRead: lastReadAt });
    else qb.andWhere('m.sent_at IS NOT NULL');
    return qb.getCount();
  }

  private conversationView(
    conv: Conversation,
    me: ConversationParticipant | null,
    counterpart: User | null,
    lastMessage: ChatMessage | null,
    unread: number,
    members: User[] = [],
  ) {
    return {
      id: conv.id,
      kind: conv.kind,
      last_message_at: conv.last_message_at,
      muted: me?.muted ?? false,
      pinned: me?.pinned ?? false,
      last_read_at: me?.last_read_at ?? null,
      unread_count: unread,
      counterpart: counterpart ? this.brief(counterpart) : null,
      members: members.map((u) => this.brief(u)),
      last_message: lastMessage
        ? { id: lastMessage.id, content: lastMessage.deleted_at === null ? lastMessage.content : null, deleted: lastMessage.deleted_at !== null, sender_id: lastMessage.sender_id, sent_at: lastMessage.sent_at }
        : null,
    };
  }

  private messageView(m: ChatMessage) {
    const deleted = m.deleted_at !== null;
    return {
      id: m.id,
      conversation_id: m.conversation_id,
      sender: this.brief(m.sender),
      content: deleted ? null : m.content,
      deleted,
      media_id: m.media_id,
      media_url: !deleted ? m.media?.url ?? null : null,
      sent_at: m.sent_at,
      edited_at: m.edited_at,
    };
  }

  private brief(u?: User | null) {
    if (!u) return null;
    return { id: u.id, name: u.name, role: u.role, avatar_url: u.avatar_media?.url ?? null };
  }
}
