import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { bigint } from '../../common/util/column';
import { ConversationKind } from '../../common/auth.types';
import { MediaObject } from '../../entities';
import { User } from '../../entities';

/**
 * §6.9 messaging. Direct conversations are deduped by `pair_key`
 * ("min:max" of the two user ids, partial unique index conversations_dm_pair_uniq).
 * Read state is per participant (last_read_at) — never a boolean column.
 */
@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'text', default: 'direct' })
  kind: ConversationKind;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @Column({ type: 'text', nullable: true })
  pair_key: string | null;

  /** Cache/sort key for the inbox list; recomputed on every send. */
  @Column({ type: 'timestamptz', nullable: true })
  last_message_at: Date | null;

  @OneToMany(() => ConversationParticipant, (p) => p.conversation)
  participants: ConversationParticipant[];

  @OneToMany(() => ChatMessage, (m) => m.conversation)
  messages: ChatMessage[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  static pairKey(a: string, b: string): string {
    return [a, b].sort((x, y) => Number(x) - Number(y)).join(':');
  }
}

@Entity('conversation_participants')
export class ConversationParticipant {
  @PrimaryColumn({ type: 'bigint' })
  conversation_id: string;

  @ManyToOne(() => Conversation, (c) => c.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @PrimaryColumn({ type: 'bigint' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  joined_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_read_at: Date | null;

  @Column({ type: 'boolean', default: false })
  muted: boolean;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', transformer: bigint })
  conversation_id: string;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ type: 'bigint', transformer: bigint })
  sender_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  media_id: string | null;

  @ManyToOne(() => MediaObject, { nullable: true })
  @JoinColumn({ name: 'media_id' })
  media: MediaObject | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  sent_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  edited_at: Date | null;

  /** Soft delete: row keeps existing for thread integrity (§6.9). */
  @Column({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;
}
