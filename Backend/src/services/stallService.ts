import { getDb } from '../db/index.ts';
import { StallRepository, type FindAllParams } from '../repositories/stallRepository.ts';
import { MenuItemRepository } from '../repositories/menuItemRepository.ts';
import { AuditService } from './auditService.ts';
import type { MenuItemDto, StallResponseDto } from '../dtos/stallDto.ts';
import { ForbiddenError } from '../errors/ForbiddenError.ts';
import { NotFoundError } from '../errors/NotFoundError.ts';
import type { AuthUser } from './tokenService.ts';
import type { CreateStallInput, UpdateStallInput } from '../schemas/stallSchema.ts';

type StallRow = NonNullable<Awaited<ReturnType<StallRepository['findById']>>>;

export class StallService {
  private stallRepository: StallRepository;
  private menuItemRepository: MenuItemRepository;
  private auditService: AuditService;

  constructor(
    stallRepository: StallRepository = new StallRepository(),
    menuItemRepository: MenuItemRepository = new MenuItemRepository(),
    auditService: AuditService = new AuditService(),
  ) {
    this.stallRepository = stallRepository;
    this.menuItemRepository = menuItemRepository;
    this.auditService = auditService;
  }

  private toDto(row: StallRow): StallResponseDto {
    const avgRating = Number(row.avgRating);
    return {
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      category: row.category,
      location: row.location,
      description: row.description,
      avgRating,
      reviewCount: row.reviewCount,
      isPopular: avgRating >= 4.7,
    };
  }

  private toAuditSnapshot(row: StallRow) {
    return {
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      category: row.category,
      location: row.location,
      description: row.description,
    };
  }

  async getAllStalls(params: FindAllParams) {
    const { rows, total } = await this.stallRepository.findAll(params);
    return { data: rows.map((row) => this.toDto(row)), total };
  }

  async getStallById(id: number): Promise<StallResponseDto> {
    const row = await this.stallRepository.findById(id);
    if (!row) throw new NotFoundError('Warung tidak ditemukan');
    return this.toDto(row);
  }

  async getStallMenus(id: number): Promise<MenuItemDto[]> {
    const row = await this.stallRepository.findById(id);
    if (!row) throw new NotFoundError('Warung tidak ditemukan');
    return this.menuItemRepository.findByStallId(id);
  }

  async createStall(input: CreateStallInput, ownerId: number): Promise<StallResponseDto> {
    const db = await getDb();
    const row = await db.transaction(async (tx) => {
      const created = await this.stallRepository.create({ ...input, ownerId }, tx);
      if (!created) throw new NotFoundError('Warung gagal dibuat');

      await this.auditService.recordInTransaction(
        {
          userId: ownerId,
          action: 'CREATE_STALL',
          targetTable: 'STALLS',
          targetId: created.id,
          metadata: { after: this.toAuditSnapshot(created) },
        },
        tx,
      );

      return created;
    });

    return this.toDto(row);
  }

  async updateStall(id: number, input: UpdateStallInput, user: AuthUser): Promise<StallResponseDto> {
    const db = await getDb();
    const row = await db.transaction(async (tx) => {
      const current = await this.stallRepository.findById(id, tx);
      if (!current) throw new NotFoundError('Warung tidak ditemukan');

      if (user.role !== 'admin' && current.ownerId !== user.id) {
        throw new ForbiddenError('Kamu hanya bisa mengubah warung milikmu sendiri');
      }

      const updated = await this.stallRepository.update(id, input, tx);
      if (!updated) throw new NotFoundError('Warung tidak ditemukan');

      const changed = (Object.keys(input) as Array<keyof UpdateStallInput>).filter(
        (key) => input[key] !== undefined && current[key] !== updated[key],
      );

      await this.auditService.recordInTransaction(
        {
          userId: user.id,
          action: 'UPDATE_STALL',
          targetTable: 'STALLS',
          targetId: updated.id,
          metadata: {
            before: this.toAuditSnapshot(current),
            after: this.toAuditSnapshot(updated),
            changed,
          },
        },
        tx,
      );

      return updated;
    });

    return this.toDto(row);
  }

  async deleteStall(id: number, actorId: number): Promise<StallResponseDto> {
    const db = await getDb();
    const row = await db.transaction(async (tx) => {
      const removed = await this.stallRepository.remove(id, tx);
      if (!removed) throw new NotFoundError('Warung tidak ditemukan');

      await this.auditService.recordInTransaction(
        {
          userId: actorId,
          action: 'DELETE_STALL',
          targetTable: 'STALLS',
          targetId: removed.id,
          metadata: { before: this.toAuditSnapshot(removed) },
        },
        tx,
      );

      return removed;
    });

    return this.toDto(row);
  }
}
