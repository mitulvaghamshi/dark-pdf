import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import BatchSummary from "./BatchSummary";
import PdfReader, { type FileState, type PreviewItem } from "./PdfReader";

// Import PDF.js worker as a URL asset so Vite bundles it as a separate file
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function App() {
  const [files, setFiles] = useState<FileState[]>([]);
  const [quality, setQuality] = useState<number>(3);
  const [rangeMode, setRangeMode] = useState<"all" | "custom">("all");
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<string>("");
  const [tolerance, setTolerance] = useState<number>(20);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manage Online/Offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Listen for PWA installation prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = async (rawFiles: File[]) => {
    const pdfFiles = rawFiles.filter((file) => file.type === "application/pdf");
    if (pdfFiles.length === 0) return;

    const newFiles: FileState[] = [];
    for (const file of pdfFiles) {
      let totalPages = 0;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        }).promise;
        totalPages = pdf.numPages;
        await (pdf as any).destroy?.();
      } catch (e) {
        console.warn("Could not pre-fetch total pages for", file.name, e);
      }

      newFiles.push({
        file,
        id: Math.random().toString(36).substring(2, 9),
        progress: 0,
        status: "pending",
        totalPages,
        currentPage: 0,
      });
    }

    setFiles((prev) => {
      const updated = [...prev, ...newFiles];
      if (updated.length === 1) {
        setSelectedFileId(updated[0].id);
      }
      return updated;
    });
  };

  const removeFile = (id: string) => {
    // Revoke preview URLs for this file
    previews
      .filter((p) => p.id === id)
      .forEach((p) => URL.revokeObjectURL(p.imgUrl));

    const fileToRemove = files.find((f) => f.id === id);
    if (fileToRemove?.downloadUrl) {
      URL.revokeObjectURL(fileToRemove.downloadUrl);
    }

    setFiles((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (updated.length === 1) {
        setSelectedFileId(updated[0].id);
      } else if (selectedFileId === id) {
        setSelectedFileId(null);
      }
      return updated;
    });
    setPreviews((prev) => prev.filter((item) => item.id !== id));
    if (activeFileId === id) {
      setActiveFileId(null);
    }
  };

  const clearAll = () => {
    // Revoke object URLs to prevent memory leak
    previews.forEach((p) => URL.revokeObjectURL(p.imgUrl));
    files.forEach((f) => {
      if (f.downloadUrl) URL.revokeObjectURL(f.downloadUrl);
    });
    setFiles([]);
    setPreviews([]);
    setActiveFileId(null);
    setSelectedFileId(null);
  };

  const handleDownload = (fileState: FileState) => {
    if (!fileState.downloadUrl || !fileState.downloadName) return;
    const link = document.createElement("a");
    link.href = fileState.downloadUrl;
    link.download = fileState.downloadName;
    link.click();
  };

  const startConversion = async () => {
    const pendingFiles = files.filter((f) =>
      f.status === "pending" || f.status === "failed"
    );
    if (pendingFiles.length === 0) return;

    for (const fileState of pendingFiles) {
      setActiveFileId(fileState.id);
      setFiles((prev) =>
        prev.map((
          f,
        ) => (f.id === fileState.id ? { ...f, status: "processing" } : f))
      );

      try {
        await processPdfFile(fileState);
      } catch (err) {
        console.error(`Error converting ${fileState.file.name}:`, err);
        setFiles((prev) =>
          prev.map((
            f,
          ) => (f.id === fileState.id
            ? { ...f, status: "failed", progress: 0 }
            : f)
          )
        );
      }
    }
    setActiveFileId(null);
  };

  const processPdfFile = async (fileState: FileState) => {
    const arrayBuffer = await fileState.file.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);

    // Load original PDF
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const totalPages = pdf.numPages;

    setFiles((prev) =>
      prev.map((f) => (f.id === fileState.id ? { ...f, totalPages } : f))
    );

    // Set page range
    const pageStart = Math.min(Math.max(startPage, 1), totalPages);
    let pageEndVal = totalPages;
    if (rangeMode === "custom" && endPage !== "") {
      const parsedEnd = parseInt(endPage, 10);
      if (!isNaN(parsedEnd)) {
        pageEndVal = Math.min(Math.max(parsedEnd, pageStart), totalPages);
      }
    }

    const pagesToProcess = pageEndVal - pageStart + 1;
    const pdfDoc = await PDFDocument.create();

    // Setup offscreen canvas
    const canvas = document.createElement("canvas");
    const canvasCtx = canvas.getContext("2d", { willReadFrequently: true });
    if (!canvasCtx) throw new Error("Could not create 2D canvas context");

    for (let i = pageStart; i <= pageEndVal; i++) {
      const processedCount = i - pageStart + 1;
      const progressPercent = Math.round(
        (processedCount / pagesToProcess) * 100,
      );

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileState.id
            ? { ...f, currentPage: i, progress: progressPercent }
            : f
        )
      );

      // Yield thread to UI rendering
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const page = await pdf.getPage(i);
      const baseViewport = page.getViewport({ scale: 1 });

      // Calculate high quality DPI render
      const renderScale = quality * Math.max(window.devicePixelRatio || 1, 2);
      const renderViewport = page.getViewport({ scale: renderScale });

      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;

      await page.render({
        canvas: canvas,
        canvasContext: canvasCtx,
        viewport: renderViewport,
      }).promise;

      const imageData = canvasCtx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const data = imageData.data;

      // Apply pixel-inversion for neutral colors (smart dark mode)
      const chromaThreshold = tolerance;

      for (let j = 0; j < data.length; j += 4) {
        const r = data[j];
        const g = data[j + 1];
        const b = data[j + 2];

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);

        // If color chroma (difference between channels) is low, it's a neutral/gray tone
        if (max - min <= chromaThreshold) {
          data[j] = Math.min(255, Math.max(0, 255 - r) + 25);
          data[j + 1] = Math.min(255, Math.max(0, 255 - g) + 25);
          data[j + 2] = Math.min(255, Math.max(0, 255 - b) + 25);
        }
      }

      canvasCtx.putImageData(imageData, 0, 0);

      // Convert page to image blob
      const imgBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
      });

      if (!imgBlob) throw new Error(`Failed to generate image for page ${i}`);

      const imgBytes = await imgBlob.arrayBuffer();
      const jpgImage = await pdfDoc.embedJpg(imgBytes);

      // Store preview
      const imgUrl = URL.createObjectURL(imgBlob);
      setPreviews((prev) => [
        ...prev,
        {
          id: fileState.id,
          fileName: fileState.file.name,
          pageNumber: i,
          imgUrl,
        },
      ]);

      // Embed high-res image into standard page size
      const newPage = pdfDoc.addPage([baseViewport.width, baseViewport.height]);
      newPage.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: baseViewport.width,
        height: baseViewport.height,
      });

      page.cleanup();
    }

    await (pdf as any).destroy?.();

    const finalBytes = await pdfDoc.save();
    const finalBlob = new Blob([finalBytes as any], {
      type: "application/pdf",
    });
    const downloadUrl = URL.createObjectURL(finalBlob);
    const downloadName = `${
      fileState.file.name.replace(/\.pdf$/i, "")
    } (Dark Mode).pdf`;

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileState.id
          ? {
            ...f,
            status: "completed",
            progress: 100,
            downloadUrl,
            downloadName,
          }
          : f
      )
    );

    // Trigger auto-download if multiple files are running
    if (files.length > 1) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = downloadName;
      link.click();
    }
  };

  // Single PDF is automatically selected; if multiple PDFs, use selectedFileId (or null for batch summary)
  const isSinglePdf = files.length === 1;
  const currentSelectedFile = isSinglePdf
    ? files[0]
    : selectedFileId
    ? files.find((f) => f.id === selectedFileId) || null
    : null;

  return (
    <div className="app-container">
      {/* Background Orbs for Ambient Glow */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <header className="app-header">
        <div className="logo-section">
          <div className="app-icon-container">
            <span className="app-icon-logo">🌙</span>
          </div>
          <div>
            <h1>Dark PDF</h1>
            <p className="subtitle">High Quality On-Device PDF Inverter</p>
          </div>
        </div>

        <div className="header-actions">
          <div className={`status-badge ${isOnline ? "online" : "offline"}`}>
            <span className="dot"></span>
            {isOnline ? "On-device Operation" : "Running Offline"}
          </div>
          {deferredPrompt && (
            <button className="install-btn" onClick={triggerInstall}>
              📥 Install PWA
            </button>
          )}
        </div>
      </header>

      <main className="app-content">
        {files.length === 0
          ? (
            /* File Upload / Intro State */
            <div
              className={`dropzone ${isDragOver ? "drag-over" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="application/pdf"
                style={{ display: "none" }}
              />
              <div className="dropzone-content">
                <div className="upload-icon">⊕</div>
                <h3>Drag & drop PDF files here</h3>
                <p>or click to browse from your device</p>
                <span className="badge">100% Client-Side & Secure</span>
              </div>
            </div>
          )
          : (
            /* Main Interactive Dashboard */
            <div className="dashboard">
              <div className="sidebar">
                {/* Configuration Settings Box */}
                <div className="card settings-card">
                  <h2>Conversion Options</h2>

                  <div className="settings-group">
                    <label htmlFor="quality-slider">
                      <span>Render Quality (DPI Scale)</span>
                      <span className="value-badge">{quality}x</span>
                    </label>
                    <input
                      type="range"
                      id="quality-slider"
                      min="1"
                      max="5"
                      step="1"
                      value={quality}
                      onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                      disabled={!!activeFileId}
                    />
                    <div className="slider-labels">
                      <span>Draft</span>
                      <span>HD</span>
                      <span>Max</span>
                    </div>
                  </div>

                  <div className="settings-group">
                    <label>Page Range Selection</label>
                    <div className="radio-group">
                      <button
                        type="button"
                        className={`radio-btn ${
                          rangeMode === "all" ? "active" : ""
                        }`}
                        onClick={() => setRangeMode("all")}
                        disabled={!!activeFileId}
                      >
                        All Pages
                      </button>
                      <button
                        type="button"
                        className={`radio-btn ${
                          rangeMode === "custom" ? "active" : ""
                        }`}
                        onClick={() => setRangeMode("custom")}
                        disabled={!!activeFileId}
                      >
                        Custom Range
                      </button>
                    </div>

                    {rangeMode === "custom" && (
                      <div className="range-inputs fade-in">
                        <div className="input-wrap">
                          <label>Start</label>
                          <input
                            type="number"
                            min="1"
                            value={startPage}
                            onChange={(e) =>
                              setStartPage(
                                Math.max(1, parseInt(e.target.value, 10) || 1),
                              )}
                            disabled={!!activeFileId}
                          />
                        </div>
                        <div className="input-wrap">
                          <label>End (Auto)</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="Auto"
                            value={endPage}
                            onChange={(e) => setEndPage(e.target.value)}
                            disabled={!!activeFileId}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="settings-group">
                    <label htmlFor="tolerance-slider">
                      <span>Chroma Tolerance</span>
                      <span className="value-badge">{tolerance}</span>
                    </label>
                    <input
                      type="range"
                      id="tolerance-slider"
                      min="0"
                      max="100"
                      value={tolerance}
                      onChange={(e) =>
                        setTolerance(parseInt(e.target.value, 10))}
                      disabled={!!activeFileId}
                    />
                    <span className="help-text">
                      Controls color detection. Higher retains less colors;
                      lower is stricter.
                    </span>
                  </div>

                  <div className="action-buttons">
                    <button
                      className="primary-btn run-btn"
                      onClick={startConversion}
                      disabled={!!activeFileId ||
                        files.every((f) => f.status === "completed")}
                    >
                      {activeFileId ? "Processing..." : "Start Conversion"}
                    </button>
                    <button
                      className="secondary-btn clear-btn"
                      onClick={clearAll}
                      disabled={!!activeFileId}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              <div className="main-panel">
                {/* Files Listing Card */}
                <div className="card files-card">
                  <div className="files-card-header">
                    <h2>
                      Queue ({files.length}{" "}
                      {files.length === 1 ? "file" : "files"})
                    </h2>
                    {files.length > 1 && (
                      <button
                        className={`queue-view-toggle-btn ${
                          !selectedFileId ? "active" : ""
                        }`}
                        onClick={() => setSelectedFileId(null)}
                        title="Switch to all files batch progress"
                      >
                        📊 Batch Summary
                      </button>
                    )}
                  </div>
                  <div className="files-list">
                    {files.map((fileState) => {
                      const isSelected = isSinglePdf ||
                        selectedFileId === fileState.id;
                      return (
                        <div
                          key={fileState.id}
                          className={`file-row ${
                            activeFileId === fileState.id ? "active" : ""
                          } ${
                            isSelected ? "selected" : ""
                          } ${fileState.status}`}
                        >
                          <div
                            className="file-info"
                            onClick={() => {
                              if (files.length > 1) {
                                setSelectedFileId(
                                  selectedFileId === fileState.id
                                    ? null
                                    : fileState.id,
                                );
                              }
                            }}
                            style={{
                              cursor: files.length > 1 ? "pointer" : "default",
                            }}
                            title={files.length > 1
                              ? "Click to preview this document in reader"
                              : undefined}
                          >
                            <span className="file-icon">📄</span>
                            <div className="file-metadata">
                              <div className="file-name">
                                {fileState.file.name}
                              </div>
                              <div className="file-status-label">
                                {fileState.status === "pending" &&
                                  (fileState.totalPages
                                    ? `${fileState.totalPages} pages • Ready to convert`
                                    : "Ready to convert")}
                                {fileState.status === "processing" &&
                                  `Processing page ${fileState.currentPage} of ${
                                    fileState.totalPages || "?"
                                  }`}
                                {fileState.status === "completed" &&
                                  `Conversion complete (${
                                    fileState.totalPages || "All"
                                  } pages)`}
                                {fileState.status === "failed" &&
                                  "Error during conversion"}
                              </div>
                            </div>
                          </div>

                          <div className="file-progress-and-actions">
                            {fileState.status === "processing" && (
                              <div className="file-progress-bar-container">
                                <div
                                  className="file-progress-bar-fill"
                                  style={{ width: `${fileState.progress}%` }}
                                >
                                </div>
                                <span className="progress-percentage">
                                  {fileState.progress}%
                                </span>
                              </div>
                            )}

                            <div className="actions">
                              {files.length > 1 && (
                                <button
                                  className={`queue-read-btn ${
                                    selectedFileId === fileState.id
                                      ? "active"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    setSelectedFileId(
                                      selectedFileId === fileState.id
                                        ? null
                                        : fileState.id,
                                    )}
                                  title={selectedFileId === fileState.id
                                    ? "Close reader view and return to batch summary"
                                    : "Open in browser reader"}
                                >
                                  {selectedFileId === fileState.id
                                    ? "Viewing"
                                    : "📖 Read"}
                                </button>
                              )}

                              {fileState.status === "completed" && (
                                <button
                                  className="download-btn-row"
                                  onClick={() => handleDownload(fileState)}
                                  title="Download PDF"
                                >
                                  ⬇ Download
                                </button>
                              )}
                              {!activeFileId && (
                                <button
                                  className="remove-btn"
                                  onClick={() => removeFile(fileState.id)}
                                  title="Remove from queue"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {
                  /* When one PDF is selected: On-Browser Reader with full screen option.
                  Else: Batch Summary displaying number of pages processed instead of preview tiles */
                }
                {currentSelectedFile
                  ? (
                    <PdfReader
                      fileState={currentSelectedFile}
                      previews={previews}
                      showBackToBatch={files.length > 1}
                      onBackToBatch={() => setSelectedFileId(null)}
                      onDownload={handleDownload}
                      onStartConversion={startConversion}
                      isConverting={!!activeFileId}
                    />
                  )
                  : (
                    <BatchSummary
                      files={files}
                      previews={previews}
                      activeFileId={activeFileId}
                      onSelectFile={(id) => setSelectedFileId(id)}
                      // onStartConversion={startConversion}
                    />
                  )}
              </div>
            </div>
          )}
      </main>

      <footer className="app-footer">
        <p>Powered by React with pdf.js and pdf-lib.</p>
        <p>
          All processing runs inside your browser. No files are uploaded to
          server. Because I don't have one!
        </p>
      </footer>
    </div>
  );
}
