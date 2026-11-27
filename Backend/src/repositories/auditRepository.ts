import { and, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { getDb } from '../db/index.ts';
import { auditLogs, users } from '../db/schema.ts';
import type { CreateAuditInput } from '../dtos/auditDto.ts';
import type { AuditQuery } from '../schemas/auditSchema.ts';

type DbInstance = Awaited<ReturnType<typeof getDb>>;
export type DbExecutor = DbInstance | Parameters<Parameters<DbInstance['transaction']>[0]>[0];

export class AuditRepository {
  private buildWhere(params: AuditQuery): SQL | undefined {
    const conditions: SQL[] = [];

    if (params.action) {
      conditions.push(eq(auditLogs.action, params.action));
    }
    if (params.targetTable) {
      conditions.push(eq(auditLogs.targetTable, params.targetTable));
    }
    if (params.targetId !== undefined) {
      conditions.push(eq(auditLogs.targetId, params.targetId));
    }
    if (params.userId !== undefined) {
      conditions.push(eq(auditLogs.userId, params.userId));
    }
    if (params.from) {
      conditions.push(gte(auditLogs.createdAt, new Date(`${params.from}T00:00:00.000Z`)));
    }
    if (params.to) {
      conditions.push(lte(auditLogs.createdAt, new Date(`${params.to}T23:59:59.999Z`)));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  async findAll(params: AuditQuery) {
    const db = await getDb();
    const where = this.buildWhere(params);
    const offset = (params.page - 1) * params.pageSize;

    const rows = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email,
        action: auditLogs.action,
        targetTable: auditLogs.targetTable,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .offset(offset)
      .fetch(params.pageSize);

    const totals = await db
      .select({ total: count() })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(where);

    return { rows, total: Number(totals[0]?.total ?? 0) };
  }

  async findById(id: number) {
    const db = await getDb();
    const rows = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email,
        action: auditLogs.action,
        targetTable: auditLogs.targetTable,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.id, id));
    return rows[0];
  }

  async create(input: CreateAuditInput, executor?: DbExecutor) {
    const db = executor ?? (await getDb());
    const metadataValue =
      input.metadata === undefined || input.metadata === null
        ? null
        : typeof input.metadata === 'string'
          ? input.metadata
          : JSON.stringify(input.metadata);

    const rows = await db
      .insert(auditLogs)
      .output()
      .values({
        userId: input.userId,
        action: input.action,
        targetTable: input.targetTable,
        targetId: input.targetId,
        metadata: metadataValue,
        createdAt: new Date(),
      });
    return rows[0];
  }
}
