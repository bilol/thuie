import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { OtpPurpose } from '../../common/auth.types';

/** §3.2 / BACKEND §12.2 — OTP for registration verification & password reset. */
@Entity('verification_tokens')
@Index('verification_lookup_idx', ['identifier', 'purpose'])
export class VerificationToken {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** Phone or email the code was sent to. */
  @Column()
  identifier: string;

  @Column({ type: 'text' })
  purpose: OtpPurpose;

  /** sha256 of the 6-digit code — plaintext never persists. */
  @Column()
  code_hash: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  /** Wrong-code counter; ≥5 locks the token (§3.2). */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  consumed_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
