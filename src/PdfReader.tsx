import React, { useEffect, useRef, useState } from "react";

export interface PreviewItem {
  id: string;
  fileName: string;
  pageNumber: number;
  imgUrl: string;
}

export interface FileState {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "processing" | "completed" | "failed";
  totalPages: number;
  currentPage: number;
  downloadUrl?: string;
  downloadName?: string;
}

interface PdfReaderProps {
  fileState: FileState;
  previews: PreviewItem[];
  showBackToBatch?: boolean;
  onBackToBatch?: () => void;
  onDownload?: (fileState: FileState) => void;
  onStartConversion?: () => void;
  isConverting?: boolean;
}

export default function PdfReader({
  fileState,
  previews,
  showBackToBatch,
  onBackToBatch,
  onDownload,
  onStartConversion,
  isConverting,
}: PdfReaderProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"continuous" | "single">(
    "continuous",
  );
  const [zoom, setZoom] = useState<number>(100);
  const [fitWidth, setFitWidth] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [inputPageVal, setInputPageVal] = useState<string>("1");

  const readerContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Filter previews strictly for this file and sort ascending by page number
  const filePreviews = previews
    .filter((p) => p.id === fileState.id)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  const totalPagesCount = fileState.totalPages || filePreviews.length || 1;

  // Keep input page string in sync with currentPage
  useEffect(() => {
    setInputPageVal(String(currentPage));
  }, [currentPage]);

  // Fullscreen listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentFullscreen =
        document.fullscreenElement === readerContainerRef.current ||
        (document as any).webkitFullscreenElement ===
          readerContainerRef.current;
      setIsFullscreen(Boolean(isCurrentFullscreen));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  // Toggle browser fullscreen with fallback
  const toggleFullscreen = async () => {
    const container = readerContainerRef.current;
    if (!container) return;

    try {
      if (
        !document.fullscreenElement &&
        !(document as any).webkitFullscreenElement
      ) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen API error, using CSS fullscreen:", err);
      setIsFullscreen((prev) => !prev);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        goToPage(currentPage + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        goToPage(currentPage - 1);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPagesCount, isFullscreen, viewMode]);

  // Scroll to page or change page
  const goToPage = (targetPage: number) => {
    const maxPage = Math.max(
      1,
      filePreviews.length > 0
        ? filePreviews[filePreviews.length - 1].pageNumber
        : totalPagesCount,
    );
    const clamped = Math.min(Math.max(1, targetPage), maxPage);
    setCurrentPage(clamped);

    if (viewMode === "continuous") {
      const pageEl = pageRefs.current[clamped];
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Track active page during continuous scroll
  const handleScroll = () => {
    if (viewMode !== "continuous" || !scrollContainerRef.current) return;
    const containerTop = scrollContainerRef.current.getBoundingClientRect().top;

    let closestPage = currentPage;
    let minDistance = Infinity;

    for (const preview of filePreviews) {
      const el = pageRefs.current[preview.pageNumber];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerTop - 40);
      if (distance < minDistance) {
        minDistance = distance;
        closestPage = preview.pageNumber;
      }
    }

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPageVal(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(inputPageVal, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setInputPageVal(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    setFitWidth(false);
    setZoom((prev) => Math.min(250, prev + 25));
  };

  const handleZoomOut = () => {
    setFitWidth(false);
    setZoom((prev) => Math.max(50, prev - 25));
  };

  const handleFitWidth = () => {
    setFitWidth(true);
    setZoom(100);
  };

  const handleResetZoom = () => {
    setFitWidth(false);
    setZoom(100);
  };

  return (
    <div
      ref={readerContainerRef}
      className={`card reader-container ${isFullscreen ? "is-fullscreen" : ""}`}
    >
      {/* Reader Control Toolbar */}
      <div className="reader-toolbar">
        <div className="reader-toolbar-left">
          {showBackToBatch && onBackToBatch && (
            <button
              className="reader-btn back-btn"
              onClick={onBackToBatch}
              title="Return to batch overview"
            >
              ← Batch Overview
            </button>
          )}
          <div className="reader-doc-info">
            <span className="reader-doc-icon">📖</span>
            <div className="reader-doc-title-wrap">
              <span className="reader-doc-title" title={fileState.file.name}>
                {fileState.file.name}
              </span>
              <span className={`reader-status-pill ${fileState.status}`}>
                {fileState.status === "processing" &&
                  `Inverting p. ${fileState.currentPage}/${totalPagesCount}`}
                {fileState.status === "completed" && "Dark Mode Ready"}
                {fileState.status === "pending" && "Ready to Invert"}
                {fileState.status === "failed" && "Conversion Error"}
              </span>
            </div>
          </div>
        </div>

        {/* Page Navigation */}
        <div className="reader-toolbar-center">
          <button
            className="reader-btn nav-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Previous page (Left arrow)"
          >
            ◀
          </button>

          <form
            onSubmit={handlePageInputSubmit}
            className="reader-page-indicator-form"
          >
            <span>Page</span>
            <input
              type="text"
              value={inputPageVal}
              onChange={handlePageInputChange}
              onBlur={handlePageInputSubmit}
              className="reader-page-input"
              aria-label="Current page"
            />
            <span>of {totalPagesCount}</span>
          </form>

          <button
            className="reader-btn nav-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPagesCount}
            title="Next page (Right arrow)"
          >
            ▶
          </button>

          {/* View Mode Toggle */}
          <div className="reader-view-mode-toggle">
            <button
              className={`reader-mode-btn ${
                viewMode === "continuous" ? "active" : ""
              }`}
              onClick={() => setViewMode("continuous")}
              title="Continuous vertical scroll mode"
            >
              Scroll
            </button>
            <button
              className={`reader-mode-btn ${
                viewMode === "single" ? "active" : ""
              }`}
              onClick={() => setViewMode("single")}
              title="Single page mode"
            >
              Single
            </button>
          </div>
        </div>

        {/* Zoom & Fullscreen Actions */}
        <div className="reader-toolbar-right">
          <div className="reader-zoom-controls">
            <button
              className="reader-btn icon-btn"
              onClick={handleZoomOut}
              disabled={zoom <= 50 && !fitWidth}
              title="Zoom out (-)"
            >
              −
            </button>
            <button
              className={`reader-btn zoom-label-btn ${
                fitWidth ? "active" : ""
              }`}
              onClick={fitWidth ? handleResetZoom : handleFitWidth}
              title="Toggle Fit Width / 100%"
            >
              {fitWidth ? "Fit" : `${zoom}%`}
            </button>
            <button
              className="reader-btn icon-btn"
              onClick={handleZoomIn}
              disabled={zoom >= 250}
              title="Zoom in (+)"
            >
              +
            </button>
          </div>

          <button
            className={`reader-btn fullscreen-btn ${
              isFullscreen ? "active" : ""
            }`}
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Full Screen (Esc)" : "Full Screen (F)"}
          >
            {isFullscreen ? "🗗 Exit Fullscreen" : "⛶ Fullscreen"}
          </button>

          {fileState.status === "completed" && onDownload && (
            <button
              className="reader-btn download-highlight-btn"
              onClick={() => onDownload(fileState)}
              title="Download inverted Dark PDF"
            >
              ⬇ Download
            </button>
          )}
        </div>
      </div>

      {/* Reader Viewport */}
      <div
        ref={scrollContainerRef}
        className="reader-viewport"
        onScroll={handleScroll}
      >
        {filePreviews.length === 0
          ? (
            /* Empty / In-Progress Placeholder */
            <div className="reader-placeholder">
              {fileState.status === "processing"
                ? (
                  <div className="reader-empty-state">
                    <div className="reader-spinner"></div>
                    <h3>Inverting to Dark Mode...</h3>
                    <p>
                      Processing page {fileState.currentPage || 1} of{" "}
                      {totalPagesCount}
                    </p>
                    <div className="reader-loading-bar-wrap">
                      <div
                        className="reader-loading-bar-fill"
                        style={{ width: `${fileState.progress}%` }}
                      >
                      </div>
                    </div>
                  </div>
                )
                : fileState.status === "failed"
                ? (
                  <div className="reader-empty-state error">
                    <span className="empty-icon">⚠️</span>
                    <h3>Failed to convert this document</h3>
                    <p>
                      An error occurred during inversion. You can retry
                      conversion from the sidebar.
                    </p>
                  </div>
                )
                : (
                  <div className="reader-empty-state pending">
                    <span className="empty-icon">📖</span>
                    <h3>Ready to Invert</h3>
                    <p>
                      1 document selected ({totalPagesCount}{" "}
                      pages). Start conversion to invert colors and read in Dark
                      Mode.
                    </p>
                    {onStartConversion && (
                      <button
                        className="primary-btn reader-start-btn"
                        onClick={onStartConversion}
                        disabled={isConverting}
                      >
                        {isConverting ? "Processing..." : "Start Conversion"}
                      </button>
                    )}
                  </div>
                )}
            </div>
          )
          : viewMode === "continuous"
          ? (
            /* Continuous Scroll Mode */
            <div
              className="reader-pages-flow"
              style={{
                width: fitWidth ? "100%" : `${zoom}%`,
                maxWidth: fitWidth ? "950px" : "none",
              }}
            >
              {filePreviews.map((preview) => (
                <div
                  key={preview.pageNumber}
                  ref={(el) => {
                    pageRefs.current[preview.pageNumber] = el;
                  }}
                  className={`reader-page-card ${
                    currentPage === preview.pageNumber ? "active-page" : ""
                  }`}
                  id={`reader-page-${preview.pageNumber}`}
                >
                  <div className="reader-page-header">
                    <span className="reader-page-tag">
                      Page {preview.pageNumber}
                    </span>
                    <span className="reader-page-total">
                      of {totalPagesCount}
                    </span>
                  </div>
                  <div className="reader-page-canvas-wrap">
                    <img
                      src={preview.imgUrl}
                      alt={`${preview.fileName} - Page ${preview.pageNumber}`}
                      className="reader-page-image"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}

              {/* In-progress banner if more pages are converting */}
              {fileState.status === "processing" &&
                filePreviews.length < totalPagesCount && (
                <div className="reader-ongoing-page-indicator">
                  <div className="small-spinner"></div>
                  <span>
                    Inverting page {filePreviews.length + 1} of{" "}
                    {totalPagesCount}...
                  </span>
                </div>
              )}
            </div>
          )
          : (
            /* Single Page Mode */
            <div
              className="reader-single-page-wrap"
              style={{
                width: fitWidth ? "100%" : `${zoom}%`,
                maxWidth: fitWidth ? "950px" : "none",
              }}
            >
              {(() => {
                const currentPreview =
                  filePreviews.find((p) => p.pageNumber === currentPage) ||
                  filePreviews[0];

                if (!currentPreview) {
                  return (
                    <div className="reader-empty-state">
                      <p>Page {currentPage} is not yet generated.</p>
                    </div>
                  );
                }

                return (
                  <div className="reader-page-card active-page">
                    <div className="reader-page-header">
                      <span className="reader-page-tag">
                        Page {currentPreview.pageNumber}
                      </span>
                      <span className="reader-page-total">
                        of {totalPagesCount}
                      </span>
                    </div>
                    <div className="reader-page-canvas-wrap">
                      <img
                        src={currentPreview.imgUrl}
                        alt={`${currentPreview.fileName} - Page ${currentPreview.pageNumber}`}
                        className="reader-page-image"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
      </div>
    </div>
  );
}
