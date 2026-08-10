export interface ImportReport {
  total: number;
  successful: number;
  skipped: number;
  failed: number;
  failedComics: Array<{ title: string; reason: string }>;
  duration: number;
}

export interface ImportReportModalProps {
  report: ImportReport | null;
  isOpen: boolean;
  onClose: () => void;
  tr: (id: string, en: string) => string;
}

export function ImportReportModal({ report, isOpen, onClose, tr }: ImportReportModalProps) {
  if (!isOpen || !report) return null;

  const successRate = Math.round((report.successful / report.total) * 100);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2>{tr('Hasil Impor', 'Import Results')}</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          {/* Success Rate */}
          <div style={styles.successCard}>
            <div style={styles.successRate}>{successRate}%</div>
            <div style={styles.successText}>{tr('Berhasil', 'Successful')}</div>
          </div>

          {/* Stats Grid */}
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{report.total}</div>
              <div style={styles.statLabel}>{tr('Total', 'Total')}</div>
            </div>
            <div style={{ ...styles.statBox, borderLeftColor: '#4caf50' }}>
              <div style={{ ...styles.statValue, color: '#4caf50' }}>{report.successful}</div>
              <div style={styles.statLabel}>{tr('Berhasil', 'Successful')}</div>
            </div>
            <div style={{ ...styles.statBox, borderLeftColor: '#ff9800' }}>
              <div style={{ ...styles.statValue, color: '#ff9800' }}>{report.skipped}</div>
              <div style={styles.statLabel}>{tr('Dilewati', 'Skipped')}</div>
            </div>
            <div style={{ ...styles.statBox, borderLeftColor: '#f44336' }}>
              <div style={{ ...styles.statValue, color: '#f44336' }}>{report.failed}</div>
              <div style={styles.statLabel}>{tr('Gagal', 'Failed')}</div>
            </div>
          </div>

          {/* Duration */}
          <div style={styles.duration}>
            ⏱️ {tr('Durasi: ', 'Duration: ')}{(report.duration / 1000).toFixed(1)}s
          </div>

          {/* Failed Items */}
          {report.failed > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>❌ {tr('Komik yang gagal', 'Failed comics')}</h3>
              <div style={styles.failedList}>
                {report.failedComics.map((item, i) => (
                  <div key={i} style={styles.failedItem}>
                    <div style={styles.failedTitle}>{item.title}</div>
                    <small style={styles.failedReason}>{item.reason}</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div style={styles.summary}>
            {report.successful > 0 && (
              <p>✅ {report.successful} {tr('komik berhasil ditambahkan', 'comics added successfully')}</p>
            )}
            {report.skipped > 0 && (
              <p>⏭️ {report.skipped} {tr('komik sudah ada (dilewati)', 'comics already exist (skipped)')}</p>
            )}
            {report.failed > 0 && (
              <p>❌ {report.failed} {tr('komik gagal diimpor', 'comics failed to import')}</p>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.btnClose}>
            {tr('Tutup', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #eee',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
  },
  content: {
    padding: '20px',
  },
  successCard: {
    textAlign: 'center' as const,
    padding: '20px',
    backgroundColor: '#f0f7ff',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  successRate: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#2196f3',
  },
  successText: {
    fontSize: '14px',
    color: '#666',
    marginTop: '8px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  statBox: {
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    borderLeft: '4px solid #2196f3',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
  },
  duration: {
    textAlign: 'center' as const,
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
  },
  failedList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  failedItem: {
    padding: '10px',
    backgroundColor: '#fff3e0',
    borderLeft: '3px solid #f44336',
    borderRadius: '4px',
    paddingLeft: '12px',
  },
  failedTitle: {
    fontWeight: '500',
    fontSize: '14px',
    marginBottom: '2px',
  },
  failedReason: {
    color: '#d32f2f',
    fontSize: '12px',
  },
  summary: {
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    fontSize: '14px',
  },
  footer: {
    display: 'flex',
    padding: '20px',
    borderTop: '1px solid #eee',
    justifyContent: 'flex-end',
  },
  btnClose: {
    padding: '8px 24px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#2196f3',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500',
  },
};
