import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RolloutStrategy {
  BOOLEAN = 'BOOLEAN',
  PERCENTAGE = 'PERCENTAGE',
  USER_WHITELIST = 'USER_WHITELIST',
  USER_BLACKLIST = 'USER_BLACKLIST',
  SEGMENT_BASED = 'SEGMENT_BASED',
}

export enum FlagStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  key: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: RolloutStrategy,
    default: RolloutStrategy.BOOLEAN,
  })
  rolloutStrategy: RolloutStrategy;

  @Column({
    type: 'enum',
    enum: FlagStatus,
    default: FlagStatus.DRAFT,
  })
  status: FlagStatus;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'int', default: 0 })
  rolloutPercentage: number;

  @Column({ type: 'simple-array', nullable: true })
  whitelistedUsers: string[];

  @Column({ type: 'simple-array', nullable: true })
  blacklistedUsers: string[];

  @Column({ type: 'jsonb', nullable: true })
  segmentRules: {
    role?: string[];
    level?: { min?: number; max?: number };
    xp?: { min?: number; max?: number };
    custom?: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledActivationAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduledDeactivationAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
