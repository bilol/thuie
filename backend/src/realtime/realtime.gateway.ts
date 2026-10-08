import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { ConversationParticipant } from '../entities';
import { TokenService } from '../auth/services/token.service';
import { UsersService } from '../users/services/users.service';
import { AuthUser } from '../common/decorators';

const NAMESPACE = '/realtime';

/**
 * §9 realtime contract (Socket.IO). REST stays the source of truth; this gateway
 * only delivers increments. Connections are authenticated with the same access
 * JWT (handshake auth, `Authorization` header, or `?token=`). Every socket joins
 * its own `user:<id>` room, one `conv:<id>` room per membership, and admins also
 * join `role:admin` so `moderation:status` fans out live. Presence is tracked
 * in-memory (the Redis variant would slot in behind the same shape, §10.1).
 */
@WebSocketGateway({ namespace: NAMESPACE, cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  @WebSocketServer() private server: Server;
  private readonly online = new Map<string, number>(); // userId -> live socket count

  constructor(
    private readonly tokens: TokenService,
    private readonly users: UsersService,
    @InjectRepository(ConversationParticipant) private readonly participants: Repository<ConversationParticipant>,
    config: ConfigService,
  ) {
    void config; // cors origins handled at the HTTP layer (§10.1); WS inherits it.
  }

  afterInit(server: Server): void {
    this.server = server;
    this.logger.log(`realtime gateway ready on ${NAMESPACE}`);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.tokenOf(client);
    if (!token) return this.reject(client, 'missing token');
    let userId: string;
    try {
      userId = this.tokens.verifyAccess(token).sub;
    } catch {
      return this.reject(client, 'invalid token');
    }
    const user = await this.users.findById(userId);
    if (!user || user.status === 'deleted' || user.status === 'banned') return this.reject(client, 'account unavailable');

    const auth = user.toAuthUser();
    client.data.user = auth;
    client.join(`user:${auth.id}`);
    if (auth.is_admin) client.join('role:admin');

    const memberships = await this.participants.find({ where: { user_id: auth.id } });
    memberships.forEach((m) => client.join(`conv:${m.conversation_id}`));

    const wasOffline = !this.online.has(auth.id);
    this.online.set(auth.id, (this.online.get(auth.id) ?? 0) + 1);
    if (wasOffline) this.broadcastPresence(auth.id, true);
  }

  handleDisconnect(client: Socket): void {
    const auth: AuthUser | undefined = client.data.user;
    if (!auth) return;
    const next = (this.online.get(auth.id) ?? 1) - 1;
    if (next <= 0) {
      this.online.delete(auth.id);
      this.broadcastPresence(auth.id, false);
    } else {
      this.online.set(auth.id, next);
    }
  }

  // ----------------------------------------------------------- client events --

  @SubscribeMessage('conversation:join')
  onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    if (this.isMember(client, body?.conversationId)) client.join(`conv:${body.conversationId}`);
    return { joined: Boolean(body?.conversationId) };
  }

  @SubscribeMessage('conversation:leave')
  onLeave(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    if (body?.conversationId) client.leave(`conv:${body.conversationId}`);
    return { left: Boolean(body?.conversationId) };
  }

  @SubscribeMessage('typing:start')
  onTypingStart(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    return this.relayTyping(client, body?.conversationId, true);
  }

  @SubscribeMessage('typing:stop')
  onTypingStop(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    return this.relayTyping(client, body?.conversationId, false);
  }

  // ------------------------------------------------------------- emit seams --

  /** Push a new chat message to everyone in the conversation room. */
  emitMessageNew(conversationId: string, message: unknown): void {
    this.server?.to(`conv:${conversationId}`).emit('message:new', { conversationId, message });
  }

  /** Per-participant read receipts (§9 `message:read`). */
  emitMessageRead(conversationId: string, payload: { userId: string; lastReadAt: string }): void {
    this.server?.to(`conv:${conversationId}`).emit('message:read', { conversationId, ...payload });
  }

  /** Fan out a raised notification row to the recipient's own rooms/devices. */
  emitNotification(recipientId: string, row: unknown): void {
    this.server?.to(`user:${recipientId}`).emit('notification:new', row);
  }

  /** Live moderation queue update for the admin room (§9 `moderation:status`). */
  emitModeration(payload: Record<string, unknown>): void {
    this.server?.to('role:admin').emit('moderation:status', payload);
  }

  isOnline(userId: string): boolean {
    return this.online.has(userId);
  }

  // ---------------------------------------------------------------- helpers --

  private relayTyping(client: Socket, conversationId: string | undefined, typing: boolean) {
    const auth: AuthUser | undefined = client.data.user;
    if (!auth || !conversationId || !this.isMember(client, conversationId)) return { ok: false };
    const event = typing ? 'typing:start' : 'typing:stop';
    this.server?.to(`conv:${conversationId}`).except(client.id).emit(event, { conversationId, userId: auth.id });
    return { ok: true };
  }

  /** A socket may join/act on a conversation only if it already shares that room. */
  private isMember(client: Socket, conversationId?: string): boolean {
    if (!conversationId) return false;
    return client.rooms.has(`conv:${conversationId}`);
  }

  private broadcastPresence(userId: string, isOnline: boolean): void {
    this.server?.emit('presence:update', { userId, isOnline, lastSeenAt: new Date().toISOString() });
  }

  private tokenOf(client: Socket): string | undefined {
    const authHeader = client.handshake.headers?.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    return (client.handshake.auth?.token as string) ?? bearer ?? (client.handshake.query?.token as string) ?? undefined;
  }

  private reject(client: Socket, reason: string): void {
    client.emit('unauthorized', { reason });
    client.disconnect(true);
  }
}
