import { z } from 'zod';

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const dateQuerySchema = z
  .string({ invalid_type_error: 'tanggal harus berupa teks YYYY-MM-DD' })
  .trim()
  .refine(isValidCalendarDate, {
    message: 'Format tanggal harus YYYY-MM-DD dan valid di kalender',
  });

export const auditQuerySchema = z
  .object({
    page: z.coerce
      .number({ invalid_type_error: 'page harus berupa angka' })
      .int('page harus bilangan bulat')
      .min(1, 'page minimal 1')
      .default(1),
    pageSize: z.coerce
      .number({ invalid_type_error: 'pageSize harus berupa angka' })
      .int('pageSize harus bilangan bulat')
      .min(1, 'pageSize minimal 1')
      .max(100, 'pageSize maksimal 100')
      .default(20),
    action: z
      .string({ invalid_type_error: 'action harus berupa teks' })
      .trim()
      .min(1, 'action tidak boleh kosong')
      .max(50, 'action maksimal 50 karakter')
      .optional(),
    targetTable: z
      .string({ invalid_type_error: 'targetTable harus berupa teks' })
      .trim()
      .min(1, 'targetTable tidak boleh kosong')
      .max(50, 'targetTable maksimal 50 karakter')
      .optional(),
    targetId: z.coerce
      .number({ invalid_type_error: 'targetId harus berupa angka' })
      .int('targetId harus bilangan bulat')
      .positive('targetId harus bilangan bulat positif')
      .optional(),
    userId: z.coerce
      .number({ invalid_type_error: 'userId harus berupa angka' })
      .int('userId harus bilangan bulat')
      .positive('userId harus bilangan bulat positif')
      .optional(),
    from: dateQuerySchema.optional(),
    to: dateQuerySchema.optional(),
  })
  .strict({ message: 'Parameter query tidak dikenal' })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'from tidak boleh lebih besar dari to',
    path: ['from'],
  });

export type AuditQuery = z.infer<typeof auditQuerySchema>;
