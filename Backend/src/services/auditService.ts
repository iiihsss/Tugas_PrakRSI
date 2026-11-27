import { AuditRepository, type DbExecutor } from '../repositories/auditRepository.ts';
import type {
  AuditListResponseDto,
  AuditResponseDto,
  CreateAuditInput,
} from '../dtos/auditDto.ts';
import { NotFoundError } from '../errors/NotFoundError.ts';
import type { AuditQuery } from '../schemas/auditSchema.ts';

type AuditJoinedRow = NonNullable<Awaited<ReturnType<AuditRepository['findById']>>>;

export class AuditService {
  private auditRepository: AuditRepository;

  constructor(auditRepository: AuditRepository = new AuditRepository()) {
    this.auditRepository = auditRepository;
  }

  private parseMetadata(raw: string | null): Record<string, unknown> | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { raw };
    }
  }

  private toDto(row: AuditJoinedRow): AuditResponseDto {
    return {
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      userEmail: row.userEmail,
      action: row.action,
      targetTable: row.targetTable,
      targetId: row.targetId,
      metadata: this.parseMetadata(row.metadata),
      createdAt: row.createdAt!,
    };
  }

  async getAuditLogs(query: AuditQuery): Promise<AuditListResponseDto> {
    const { rows, total } = await this.auditRepository.findAll(query);
    const totalPages = Math.ceil(total / query.pageSize);

    return {
      items: rows.map((row) => this.toDto(row)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      },
    };
  }

  async getAuditLogById(id: number): Promise<AuditResponseDto> {
    const row = await this.auditRepository.findById(id);
    if (!row) {
      throw new NotFoundError('Audit log tidak ditemukan');
    }
    return this.toDto(row);
  }

  async recordInTransaction(input: CreateAuditInput, tx: DbExecutor): Promise<void> {
    await this.auditRepository.create(input, tx);
  }

  async recordBestEffort(input: CreateAuditInput): Promise<void> {
    try {
      await this.auditRepository.create(input);
    } catch (error) {
      console.error('Best-effort audit log gagal dicatat:', error);
    }
  }
}
