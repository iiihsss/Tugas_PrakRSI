import { getDb } from '../db/index.ts';
import { ReviewRepository, type CreateReviewInput as LegacyReviewInput } from '../repositories/reviewRepository.ts';
import { StallRepository } from '../repositories/stallRepository.ts';
import { AuditService } from './auditService.ts';
import type { ReviewResponseDto } from '../dtos/reviewDto.ts';
import { AppError } from '../errors/AppError.ts';
import { NotFoundError } from '../errors/NotFoundError.ts';
import type { CreateReviewInput } from '../schemas/reviewSchema.ts';

export class ReviewService {
  private reviewRepository: ReviewRepository;
  private stallRepository: StallRepository;
  private auditService: AuditService;

  constructor(
    reviewRepository: ReviewRepository = new ReviewRepository(),
    stallRepository: StallRepository = new StallRepository(),
    auditService: AuditService = new AuditService(),
  ) {
    this.reviewRepository = reviewRepository;
    this.stallRepository = stallRepository;
    this.auditService = auditService;
  }

  private toDto(row: any): ReviewResponseDto {
    return {
      id: row.id,
      stallId: row.stallId,
      userId: row.userId,
      rating: row.rating,
      comment: row.comment,
      likeCount: row.likeCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? null,
      reviewerName: row.reviewerName,
      stallName: row.stallName,
    };
  }

  async getAllReviews(): Promise<ReviewResponseDto[]> {
    const rows = await this.reviewRepository.findAll();
    return rows.map((row: any) => this.toDto(row));
  }

  async createReview(input: LegacyReviewInput): Promise<ReviewResponseDto> {
    if (input.rating < 1 || input.rating > 5) {
      throw new Error('INVALID_RATING_VALUE');
    }
    const row = await this.reviewRepository.create(input);
    if (!row) throw new Error('REVIEW_CREATION_FAILED');
    return this.toDto(row);
  }

  async deleteReview(id: number, actorId: number): Promise<ReviewResponseDto> {
    const db = await getDb();
    const row = await db.transaction(async (tx) => {
      const removed = await this.reviewRepository.remove(id, tx);
      if (!removed) throw new NotFoundError('Data review tidak ditemukan');

      await this.reviewRepository.refreshStallSummary(removed.stallId, tx);

      await this.auditService.recordInTransaction(
        {
          userId: actorId,
          action: 'DELETE_REVIEW',
          targetTable: 'REVIEWS',
          targetId: removed.id,
          metadata: {
            before: {
              id: removed.id,
              stallId: removed.stallId,
              userId: removed.userId,
              rating: removed.rating,
              comment: removed.comment,
            },
          },
        },
        tx,
      );

      return removed;
    });

    return this.toDto(row);
  }

  async createForStall(
    stallId: number,
    userId: number,
    input: CreateReviewInput,
  ): Promise<ReviewResponseDto> {
    const db = await getDb();
    const row = await db.transaction(async (tx) => {
      const stall = await this.stallRepository.findById(stallId, tx);
      if (!stall) throw new NotFoundError('Warung tidak ditemukan');

      const existing = await this.reviewRepository.findByStallAndUser(stallId, userId, tx);
      if (existing) {
        throw new AppError(409, 'Kamu sudah pernah memberi review untuk warung ini');
      }

      const created = await this.reviewRepository.create(
        {
          stallId,
          userId,
          rating: input.rating,
          comment: input.comment ?? null,
        },
        tx,
      );
      if (!created) throw new AppError(500, 'Review gagal disimpan');

      await this.reviewRepository.refreshStallSummary(stallId, tx);

      await this.auditService.recordInTransaction(
        {
          userId,
          action: 'CREATE_REVIEW',
          targetTable: 'REVIEWS',
          targetId: created.id,
          metadata: {
            after: {
              id: created.id,
              stallId: created.stallId,
              userId: created.userId,
              rating: created.rating,
              comment: created.comment,
            },
          },
        },
        tx,
      );

      return created;
    });

    return this.toDto(row);
  }
}
