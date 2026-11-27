import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { auditApi } from '../api/auditApi';
import { parseApiError, type ParsedApiError } from '../api/axiosInstance';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusStates';
import type { AuditLog, AuditLogPagination } from '../types';

function formatIp(ip: unknown): string {
  if (!ip) return '-';
  return String(ip).replace(/^::ffff:/i, '');
}

function formatMetadata(metadata: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!metadata) return null;
  if (typeof metadata.ip_address === 'string') {
    return { ...metadata, ip_address: formatIp(metadata.ip_address) };
  }
  return metadata;
}

export function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<AuditLogPagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // Draft filter inputs
  const [actionInput, setActionInput] = useState('');
  const [targetTableInput, setTargetTableInput] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [targetIdInput, setTargetIdInput] = useState('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');

  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState<{
    action?: string;
    targetTable?: string;
    userId?: number;
    targetId?: number;
    from?: string;
    to?: string;
  }>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ParsedApiError | null>(null);

  // Detail modal state
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<ParsedApiError | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.getAll({
        page,
        pageSize,
        ...appliedFilters,
      });
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedFilters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({
      action: actionInput.trim() || undefined,
      targetTable: targetTableInput.trim() || undefined,
      userId: userIdInput.trim() ? Number(userIdInput.trim()) : undefined,
      targetId: targetIdInput.trim() ? Number(targetIdInput.trim()) : undefined,
      from: fromInput || undefined,
      to: toInput || undefined,
    });
  };

  const handleReset = () => {
    setActionInput('');
    setTargetTableInput('');
    setUserIdInput('');
    setTargetIdInput('');
    setFromInput('');
    setToInput('');
    setAppliedFilters({});
    setPage(1);
  };

  const handleOpenDetail = async (id: number) => {
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await auditApi.getById(id);
      setDetail(data);
    } catch (err) {
      setDetailError(parseApiError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
  };

  const hasActiveFilters = Object.values(appliedFilters).some((v) => v !== undefined);
  const totalPages = Math.max(1, pagination.totalPages);

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Audit Log Aktivitas</h1>
          <p className="subtitle">
            Total ditemukan: <strong>{pagination.total}</strong> catatan audit (append-only)
          </p>
        </div>
      </div>

      <form onSubmit={handleFilterSubmit} className="audit-filter-grid">
        <input
          type="text"
          placeholder="Action (mis. LOGIN, LOGOUT, CREATE_STALL)"
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          className="form-input"
        />
        <input
          type="text"
          placeholder="Target Table (mis. USERS, STALLS)"
          value={targetTableInput}
          onChange={(e) => setTargetTableInput(e.target.value)}
          className="form-input"
        />
        <input
          type="number"
          min={1}
          placeholder="Filter userId (angka)"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          className="form-input"
        />
        <input
          type="number"
          min={1}
          placeholder="Filter targetId (angka)"
          value={targetIdInput}
          onChange={(e) => setTargetIdInput(e.target.value)}
          className="form-input"
        />
        <input
          type="date"
          title="Dari tanggal (from)"
          value={fromInput}
          onChange={(e) => setFromInput(e.target.value)}
          className="form-input"
        />
        <input
          type="date"
          title="Sampai tanggal (to)"
          value={toInput}
          onChange={(e) => setToInput(e.target.value)}
          className="form-input"
        />
        <div className="audit-filter-actions">
          <button type="submit" className="btn btn-primary">
            Terapkan Filter
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={handleReset} className="btn btn-secondary">
              Reset
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <LoadingState message="Mengambil data audit log..." />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchLogs} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Tidak ada catatan audit log"
          description="Tidak ada catatan audit log yang sesuai dengan filter."
        />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Waktu</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>IP / Result</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const ip = formatIp(item.metadata?.ip_address);
                  const result = item.metadata?.result ? String(item.metadata.result) : '-';
                  return (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td>{new Date(item.createdAt).toLocaleString('id-ID')}</td>
                      <td>
                        <div>
                          <strong>{item.userName}</strong> (ID: {item.userId})
                        </div>
                        <div className="text-muted-sm">{item.userEmail}</div>
                      </td>
                      <td>
                        <span className="badge badge-category">{item.action}</span>
                      </td>
                      <td>
                        {item.targetTable} #{item.targetId}
                      </td>
                      <td>
                        <div>IP: {ip}</div>
                        {result !== '-' && <div className="text-muted-sm">Result: {result}</div>}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item.id)}
                          className="btn btn-outline btn-sm"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              &laquo; Sebelumnya
            </button>

            <span>
              Halaman <strong>{pagination.page}</strong> dari <strong>{totalPages}</strong> (Total:{' '}
              {pagination.total})
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Berikutnya &raquo;
            </button>
          </div>
        </>
      )}

      {selectedId !== null && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Audit Log #{selectedId}</h2>
              <button type="button" onClick={handleCloseModal} className="btn btn-secondary btn-sm">
                Tutup
              </button>
            </div>

            <div className="modal-body">
              {detailLoading ? (
                <LoadingState message="Memuat detail audit log..." />
              ) : detailError ? (
                <ErrorState error={detailError} onRetry={() => handleOpenDetail(selectedId)} />
              ) : detail ? (
                <div className="audit-detail-content">
                  <div className="audit-detail-grid">
                    <div>
                      <strong>ID:</strong> #{detail.id}
                    </div>
                    <div>
                      <strong>Waktu:</strong> {new Date(detail.createdAt).toLocaleString('id-ID')}
                    </div>
                    <div>
                      <strong>User:</strong> {detail.userName} (ID: {detail.userId})
                    </div>
                    <div>
                      <strong>Email:</strong> {detail.userEmail}
                    </div>
                    <div>
                      <strong>Action:</strong>{' '}
                      <span className="badge badge-category">{detail.action}</span>
                    </div>
                    <div>
                      <strong>Target:</strong> {detail.targetTable} #{detail.targetId}
                    </div>
                    <div>
                      <strong>IP Address:</strong>{' '}
                      <code>{formatIp(detail.metadata?.ip_address)}</code>
                    </div>
                    <div>
                      <strong>Result:</strong>{' '}
                      {detail.metadata?.result ? String(detail.metadata.result) : '-'}
                    </div>
                  </div>

                  <div className="audit-detail-block">
                    <strong>User Agent:</strong>
                    <div className="user-agent-box">
                      {detail.metadata?.user_agent ? String(detail.metadata.user_agent) : '-'}
                    </div>
                  </div>

                  <div className="audit-detail-block">
                    <strong>Metadata (JSON):</strong>
                    <pre className="metadata-pre">
                      {detail.metadata ? JSON.stringify(formatMetadata(detail.metadata), null, 2) : 'null'}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
