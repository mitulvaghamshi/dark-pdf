import { type FileState, type PreviewItem } from "./PdfReader";

interface BatchSummaryProps {
  files: FileState[];
  previews: PreviewItem[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onStartConversion?: () => void;
}

export default function BatchSummary({
  files,
  previews,
  activeFileId,
  onSelectFile,
  // onStartConversion,
}: BatchSummaryProps) {
  // Helper to get processed page count for each file
  const getProcessedPagesForFile = (file: FileState) => {
    if (file.status === "completed") {
      return file.totalPages || previews.filter((p) =>
        p.id === file.id
      ).length || 0;
    }
    if (file.status === "processing") {
      return file.currentPage || previews.filter((p) =>
        p.id === file.id
      ).length || 0;
    }
    // If pending or failed, check if any previews exist
    return previews.filter((p) => p.id === file.id).length || 0;
  };

  const totalProcessedPages = files.reduce(
    (sum, f) => sum + getProcessedPagesForFile(f),
    0,
  );

  const totalExpectedPages = files.reduce(
    (sum, f) => sum + (f.totalPages || 0),
    0,
  );
  const completedCount = files.filter((f) => f.status === "completed").length;
  // const processingCount = files.filter((f) => f.status === "processing").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;

  const overallProgress = totalExpectedPages > 0
    ? Math.round((totalProcessedPages / totalExpectedPages) * 100)
    : files.length > 0
    ? Math.round((completedCount / files.length) * 100)
    : 0;

  return (
    <div className="card batch-summary-card">
      <div className="batch-header">
        <div>
          <h2>Pages Processed</h2>
          <p className="batch-subtitle">
            Batch progress summary across {files.length}{" "}
            queued documents (no thumbnail rendering)
          </p>
        </div>
        <div className="batch-badge">
          <span className="batch-badge-count">{totalProcessedPages}</span>
          <span className="batch-badge-label">
            {totalExpectedPages > 0
              ? `of ${totalExpectedPages} pages`
              : "pages processed"}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="batch-metrics-grid">
        <div className="batch-metric-box">
          <span className="metric-icon">📑</span>
          <div className="metric-details">
            <span className="metric-val">{totalProcessedPages}</span>
            <span className="metric-label">Pages Processed</span>
          </div>
        </div>

        <div className="batch-metric-box">
          <span className="metric-icon">✅</span>
          <div className="metric-details">
            <span className="metric-val">
              {completedCount} / {files.length}
            </span>
            <span className="metric-label">Documents Finished</span>
          </div>
        </div>

        <div className="batch-metric-box">
          <span className="metric-icon">⚡</span>
          <div className="metric-details">
            <span className="metric-val">
              {activeFileId
                ? "Processing..."
                : completedCount === files.length
                ? "Complete"
                : `${pendingCount} Pending`}
            </span>
            <span className="metric-label">Queue State</span>
          </div>
        </div>

        <div className="batch-metric-box">
          <span className="metric-icon">📊</span>
          <div className="metric-details">
            <span className="metric-val">{overallProgress}%</span>
            <span className="metric-label">Overall Progress</span>
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="batch-overall-progress-bar">
        <div
          className="batch-overall-progress-fill"
          style={{ width: `${overallProgress}%` }}
        >
        </div>
      </div>

      {/* Per Document Breakdown List */}
      <div className="batch-files-breakdown">
        <h3>Document Status Breakdown</h3>
        <div className="batch-files-list">
          {files.map((fileState) => {
            const processedPages = getProcessedPagesForFile(fileState);
            const isCurrentlyActive = activeFileId === fileState.id;

            return (
              <div
                key={fileState.id}
                className={`batch-file-item ${fileState.status} ${
                  isCurrentlyActive ? "active-processing" : ""
                }`}
              >
                <div className="batch-file-meta-row">
                  <div className="batch-file-name-group">
                    <span className="batch-file-icon">📄</span>
                    <span
                      className="batch-file-name"
                      title={fileState.file.name}
                    >
                      {fileState.file.name}
                    </span>
                    <span className={`status-badge-inline ${fileState.status}`}>
                      {fileState.status}
                    </span>
                  </div>

                  <div className="batch-file-actions-group">
                    <span className="batch-file-pages-count">
                      <strong>{processedPages}</strong>
                      {fileState.totalPages
                        ? ` / ${fileState.totalPages} pages processed`
                        : " pages processed"}
                    </span>
                    <button
                      className="reader-btn batch-open-reader-btn"
                      onClick={() => onSelectFile(fileState.id)}
                      title="Open this document in browser reader"
                    >
                      📖 Open Reader
                    </button>
                  </div>
                </div>

                <div className="batch-file-progress-track">
                  <div
                    className="batch-file-progress-fill"
                    style={{ width: `${fileState.progress}%` }}
                  >
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
