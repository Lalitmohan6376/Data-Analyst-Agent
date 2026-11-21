import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MessageSquare,
  Table as TableIcon,
  Activity,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Plus,
  FileSpreadsheet,
  FileText,
  BarChart2,
  Sun,
  Moon,
  Mic,
  Database,
  Columns,
  AlertCircle,
  Zap,
  ShieldCheck,
  Search,
  UploadCloud,
  TrendingUp,
  Trash2
} from 'lucide-react';
import './App.css';

const API_BASE = "https://data-analyst-agent-ye85.onrender.com";

export default function App() {
  const [activeTab, setActiveTab] = useState("chat");
  const [datasetMeta, setDatasetMeta] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [activeStatus, setActiveStatus] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const [isDark, setIsDark] = useState(false);
  const [zoomImg, setZoomImg] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const [previewData, setPreviewData] = useState(null);
  const [studioPage, setStudioPage] = useState(1);
  const [studioPageSize, setStudioPageSize] = useState(15);
  const [isStudioLoading, setIsStudioLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState("");

  const [edaData, setEdaData] = useState(null);
  const [isEdaLoading, setIsEdaLoading] = useState(false);

  const fileRef = useRef(null);
  const scrollAnchor = useRef(null);

  useEffect(() => {
    if (activeTab === "chat") {
      scrollAnchor.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeStatus, activeTab]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Voice recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInputText(transcript);
      showToast(`Heard: "${transcript}"`);
    };
    recognition.start();
  };

  const fetchPreview = async (page = studioPage, size = studioPageSize) => {
    setIsStudioLoading(true);
    try {
      const url = `${API_BASE}/data-preview?page=${page}&page_size=${size}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error) {
        setPreviewData(data);
        setCanUndo(data.history_count > 1);
      }
    } catch (e) {
      console.error("Failed to load preview data", e);
    } finally {
      setIsStudioLoading(false);
    }
  };

  const fetchEda = async () => {
    setIsEdaLoading(true);
    try {
      const res = await fetch(`${API_BASE}/eda`);
      const data = await res.json();
      if (!data.error) {
        setEdaData(data);
      }
    } catch (e) {
      console.error("Failed to fetch EDA data", e);
    } finally {
      setIsEdaLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "studio") {
      fetchPreview();
    } else if (tab === "eda") {
      if (!edaData) fetchEda();
    }
  };

  const detectTaskIntent = (prompt) => {
    const p = prompt.toLowerCase();
    if (p.includes("chart") || p.includes("graph") || p.includes("plot") || p.includes("visual") || p.includes("bar") || p.includes("hist")) {
      return "Generating Visualizations & Plot Artifacts...";
    }
    if (p.includes("clean") || p.includes("drop") || p.includes("null") || p.includes("missing") || p.includes("duplicate") || p.includes("impute") || p.includes("outlier")) {
      return "Running Data Transformations & Cleaning...";
    }
    if (p.includes("insight") || p.includes("summary") || p.includes("trend") || p.includes("analyze") || p.includes("why")) {
      return "Synthesizing Key Statistical Insights...";
    }
    return "Executing Query On Active Dataset...";
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { sender: "agent", error: data.error },
        ]);
      } else {
        setDatasetMeta(data);
        setCanUndo(false);
        setEdaData(null);
        setStudioPage(1);

        setMessages([
          {
            sender: "agent",
            text: `Connected to **${data.filename}** (${data.total_rows.toLocaleString()} rows, ${data.columns.length} columns).\n\nAsk questions, request charts, clean records, or inspect the **Data Studio** and **Data Quality** tabs above.`,
            hasChart: false,
            cleanedReady: false,
          },
        ]);
        showToast(`Loaded ${data.filename}`);
        fetchPreview(1, studioPageSize);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "agent", error: "Connection Failure: Unable to reach FastAPI backend on port 8000." },
      ]);
    }
  };

  const submitQuery = async (overrideText) => {
    const query = overrideText || inputText;
    if (!query.trim() || activeStatus) return;

    const intent = detectTaskIntent(query);
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: query },
    ]);
    setInputText("");
    setActiveStatus(intent);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          thread_id: "session_" + (datasetMeta ? datasetMeta.filename : "default"),
        }),
      });

      const data = await res.json();
      const chartCreated = Boolean(data.has_chart || data.chart);

      setMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text: data.reply || (chartCreated ? "Here is the visualization generated from your data:" : "Query completed."),
          hasChart: chartCreated,
          chartTimestamp: Date.now(),
          cleanedReady: data.cleanedReady || data.cleaned_ready,
          error: data.error,
        },
      ]);
      if (data.can_undo !== undefined) {
        setCanUndo(data.can_undo);
      }
      if (data.cleaned_ready || data.cleanedReady) {
        showToast("Dataset updated! Open Data Studio to view.");
        fetchPreview();
        fetchEda();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "agent", error: `Communication Failure: ${err.message}` },
      ]);
    } finally {
      setActiveStatus(null);
    }
  };

  const handleUndo = async () => {
    try {
      const res = await fetch(`${API_BASE}/undo`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast(`Reverted to ${data.total_rows.toLocaleString()} rows.`);
        fetchPreview();
        fetchEda();
        setMessages((prev) => [
          ...prev,
          {
            sender: "agent",
            text: `Reverted dataset to previous state (${data.total_rows.toLocaleString()} rows, ${data.total_cols} columns).`,
            hasChart: false,
            cleanedReady: false
          }
        ]);
      } else {
        showToast(data.error || "Cannot undo further.");
      }
    } catch (e) {
      showToast("Undo request failed.");
    }
  };

  const handleDeleteSession = async () => {
    try {
      await fetch(`${API_BASE}/reset`, { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    setMessages([]);
    setDatasetMeta(null);
    setPreviewData(null);
    setEdaData(null);
    setCanUndo(false);
    setInputText("");
    setActiveTab("chat");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
    showToast("Chat and dataset deleted successfully.");
  };

  const filteredStudioRows = previewData && previewData.rows ? previewData.rows.filter(row => {
    if (!tableSearch.trim()) return true;
    return Object.values(row).some(v => String(v).toLowerCase().includes(tableSearch.toLowerCase()));
  }) : [];

  const healthScore = edaData ? Math.max(0, Math.min(100, Math.round(100 - (edaData.missing_pct || 0) - ((edaData.duplicate_rows / (edaData.total_rows || 1)) * 100)))) : 100;

  return (
    <div className={`shell-canvas ${isDark ? 'dark-theme' : ''}`}>
      <div className="bg-glow-orb orb-1"></div>
      <div className="bg-glow-orb orb-2"></div>

      {toastMsg && (
        <div className="toast-capsule-floating">
          <Sparkles size={14} className="toast-icon-sparkle" />
          <span>{toastMsg}</span>
        </div>
      )}

      {zoomImg && (
        <div className="lightbox-overlay" onClick={() => setZoomImg(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="btn-close-lightbox" onClick={() => setZoomImg(null)} title="Close Zoom">✕</button>
            <img src={zoomImg} alt="Enlarged Chart" className="lightbox-img" />
          </div>
        </div>
      )}

      <header className="top-header">
        <div className="header-left-col">
          <div className="header-brand">
            <div className="brand-dot"></div>
            <span className="brand-label">AI Data Analyst</span>
            <span className="brand-badge">Studio</span>
          </div>

          <nav className="header-nav-tabs">
            <button
              className={`nav-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => handleTabChange('chat')}
            >
              <MessageSquare size={14} />
              <span>Analyst Chat</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
              onClick={() => handleTabChange('studio')}
            >
              <TableIcon size={14} />
              <span>Data Studio</span>
              {datasetMeta && (
                <span className="tab-pill-badge">
                  <span className="badge-text-desktop">{datasetMeta.total_rows.toLocaleString()} rows</span>
                  <span className="badge-text-mobile">{datasetMeta.total_rows.toLocaleString()}</span>
                </span>
              )}
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'eda' ? 'active' : ''}`}
              onClick={() => handleTabChange('eda')}
            >
              <Activity size={14} />
              <span>Data Quality</span>
              {datasetMeta && (
                <span className="tab-pill-badge">
                  <span className="badge-text-desktop">{datasetMeta.columns.length} cols</span>
                  <span className="badge-text-mobile">{datasetMeta.columns.length}</span>
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="header-actions-group">
          {canUndo && (
            <button className="btn-header-undo" onClick={handleUndo} title="Revert last data transformation">
              <RotateCcw size={13} />
              <span className="btn-label-desktop">Undo Cleaning</span>
              <span className="btn-label-mobile">Undo</span>
            </button>
          )}

          {datasetMeta && (
            <a href={`${API_BASE}/download-cleaned`} className="btn-header-secondary" download title="Download Cleaned CSV">
              <Download size={13} />
              <span className="btn-label-desktop">Cleaned CSV</span>
              <span className="btn-label-mobile">CSV</span>
            </a>
          )}

          <a href={`${API_BASE}/export-report`} className="btn-header-pdf" target="_blank" rel="noreferrer" title="Export PDF Report">
            <FileText size={13} />
            <span className="btn-label-desktop">PDF Report</span>
            <span className="btn-label-mobile">PDF</span>
          </a>

          {(datasetMeta || messages.length > 0) && (
            <button
              className="btn-header-delete"
              onClick={handleDeleteSession}
              title="Delete chat and uploaded dataset"
            >
              <Trash2 size={13} />
              <span className="btn-label-desktop">Delete</span>
              <span className="btn-label-mobile">Delete</span>
            </button>
          )}

          <button
            className="btn-theme-toggle"
            onClick={() => setIsDark(!isDark)}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      <div className="main-content-viewport">
        {activeTab === 'chat' && (
          <div className="chat-layout-wrapper">
            <main className="chat-scroll-area">
              <div className="chat-center-lane">
                {messages.length === 0 ? (
                  <div className="welcome-hero-v2">
                    <div className="hero-announcement-pill">
                      <Zap size={13} className="hero-zap-icon" />
                      <span>Professional AI Data Analyst Tool</span>
                    </div>

                    <h1 className="hero-title-v2">
                      Turn Raw Data Into <span className="gradient-highlight-text">Visual Intelligence</span>
                    </h1>

                    <p className="hero-subtitle-v2">
                      Upload any CSV or Excel file to execute queries, generate publication-ready visualizations, and conduct automated quality audits.
                    </p>

                    <div className="hero-features-grid">
                      <div className="feature-tile">
                        <div className="feature-icon-box bg-indigo-subtle">
                          <Zap size={18} className="text-indigo" />
                        </div>
                        <h4>High-Performance Analytics</h4>
                        <p>Execute lightning-fast data computations, advanced statistical queries, and multi-dimensional aggregations.</p>
                      </div>

                      <div className="feature-tile">
                        <div className="feature-icon-box bg-purple-subtle">
                          <BarChart2 size={18} className="text-purple" />
                        </div>
                        <h4>Visual Chart Studio</h4>
                        <p>Generate high-resolution matplotlib and seaborn visualizations with simple natural language.</p>
                      </div>

                      <div className="feature-tile">
                        <div className="feature-icon-box bg-emerald-subtle">
                          <ShieldCheck size={18} className="text-emerald" />
                        </div>
                        <h4>Automated Data Audit</h4>
                        <p>Instantly detect missing values, duplicate entries, data types, and 1.5x IQR statistical outliers.</p>
                      </div>

                      <div className="feature-tile">
                        <div className="feature-icon-box bg-amber-subtle">
                          <TrendingUp size={18} className="text-amber" />
                        </div>
                        <h4>Executive PDF Reports</h4>
                        <p>Export professional executive summaries with embedded charts and key analytical insights in 1-click.</p>
                      </div>
                    </div>

                    <div className="hero-upload-card" onClick={() => fileRef.current?.click()}>
                      <div className="upload-card-inner">
                        <UploadCloud size={32} className="dropzone-icon" />
                        <span className="dropzone-primary-text">Upload Your CSV or Excel Dataset</span>
                        <span className="dropzone-secondary-text">Click to browse file &bull; Automatic schema detection & validation</span>
                        <button className="btn-browse-dataset" type="button">Select File</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((item, idx) => (
                    <div key={idx} className={`chat-bubble-row ${item.sender}`}>
                      {item.sender === "agent" && <div className="agent-icon-badge">AI</div>}

                      {item.sender === "user" ? (
                        <div className="user-message-pill">{item.text}</div>
                      ) : (
                        <div className="agent-card-content">
                          {item.text && (
                            <div className="prose-markdown">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {item.text}
                              </ReactMarkdown>
                            </div>
                          )}

                          {item.hasChart && (
                            <div className="chart-card-shelf">
                              <div className="chart-header-actions">
                                <span className="chart-title-tag">Generated Visualization (Click to Zoom)</span>
                                <a href={`${API_BASE}/chart.png?t=${item.chartTimestamp || Date.now()}`} download="chart.png" className="btn-download-chart-pill">
                                  <Download size={12} />
                                  <span>Download PNG</span>
                                </a>
                              </div>
                              <img
                                src={`${API_BASE}/chart.png?t=${item.chartTimestamp || Date.now()}`}
                                alt="Generated Chart"
                                className="chart-rendered-asset clickable-chart"
                                onClick={() => setZoomImg(`${API_BASE}/chart.png?t=${item.chartTimestamp || Date.now()}`)}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                                title="Click to view full size"
                              />
                            </div>
                          )}

                          {item.error && (
                            <div className="error-banner-floating">
                              <div className="error-icon-box">!</div>
                              <div>
                                <h4 className="error-title">Notice</h4>
                                <p className="error-desc">{item.error}</p>
                              </div>
                            </div>
                          )}

                          {item.cleanedReady && (
                            <div className="cleaned-banner-card">
                              <div className="cleaned-left-info">
                                <CheckCircle2 size={16} className="text-emerald" />
                                <span className="cleaned-text">Dataset cleaned & updated in memory.</span>
                              </div>
                              <div className="cleaned-btn-group">
                                <button className="btn-view-studio-pill" onClick={() => handleTabChange('studio')}>
                                  <TableIcon size={12} />
                                  <span>View in Data Studio</span>
                                </button>
                                <a href={`${API_BASE}/download-cleaned`} className="btn-download-csv-action" download="cleaned_dataset.csv">
                                  <Download size={12} />
                                  <span>Download CSV</span>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {activeStatus && (
                  <div className="chat-bubble-row agent">
                    <div className="agent-icon-badge">AI</div>
                    <div className="loading-indicator-chip">
                      <div className="pulse-orbit-ring"></div>
                      <span className="loading-label-text">{activeStatus}</span>
                    </div>
                  </div>
                )}

                <div ref={scrollAnchor} />
              </div>
            </main>

            <footer className="bottom-input-dock">
              <div className="dock-inner">
                {datasetMeta && datasetMeta.suggestions && (
                  <div className="suggestions-horizontal-bar">
                    {datasetMeta.suggestions.map((sug, i) => (
                      <button key={i} className="suggestion-chip-light" onClick={() => submitQuery(sug)}>
                        <Sparkles size={11} className="chip-sparkle-icon" />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="floating-input-capsule">
                  {datasetMeta && (
                    <div className="badge-attached-dataset">
                      <FileSpreadsheet size={12} />
                      <span>{datasetMeta.filename} ({datasetMeta.total_rows.toLocaleString()} rows)</span>
                      <button className="btn-remove-file" onClick={() => setDatasetMeta(null)}>✕</button>
                    </div>
                  )}

                  <div className="input-flex-row">
                    <button className="btn-plus-file-picker" onClick={() => fileRef.current?.click()} title="Upload CSV or Excel">
                      <Plus size={16} />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />

                    <button
                      type="button"
                      className={`btn-voice-mic ${isListening ? 'listening' : ''}`}
                      onClick={startVoiceInput}
                      title={isListening ? "Listening... Speak now" : "Speak your query"}
                    >
                      <Mic size={16} />
                    </button>

                    <input
                      type="text"
                      className="core-input-field"
                      placeholder={
                        isListening
                          ? "Listening to voice... Speak now!"
                          : datasetMeta
                            ? "Ask any question, request charts, or clean data..."
                            : "Attach a CSV or Excel dataset to begin analysis..."
                      }
                      value={inputText}
                      disabled={Boolean(activeStatus)}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitQuery()}
                    />

                    <button
                      className="btn-circle-submit"
                      disabled={Boolean(activeStatus) || !inputText.trim()}
                      onClick={() => submitQuery()}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="studio-view-container">
            {!datasetMeta ? (
              <div className="empty-studio-screen">
                <FileSpreadsheet size={48} className="empty-icon-art" />
                <h3>No Dataset Loaded</h3>
                <p>Upload a CSV or Excel dataset to inspect and filter data records.</p>
                <button className="btn-upload-action-pill" onClick={() => fileRef.current?.click()} style={{ marginTop: '16px' }}>
                  <Plus size={14} />
                  <span>Upload Dataset</span>
                </button>
              </div>
            ) : (
              <div className="studio-content-layout">
                <div className="studio-toolbar-strip">
                  <div className="studio-toolbar-left">
                    <span className="dataset-title-pill">
                      <b>{datasetMeta.filename}</b> &bull; {datasetMeta.total_rows.toLocaleString()} rows &bull; {datasetMeta.columns.length} columns
                    </span>
                  </div>

                  <div className="studio-actions-right">
                    <div className="table-search-input-box">
                      <Search size={13} className="search-icon-muted" />
                      <input
                        type="text"
                        placeholder="Filter page records..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="table-search-field"
                      />
                      {tableSearch && (
                        <button className="btn-clear-search" onClick={() => setTableSearch("")}>✕</button>
                      )}
                    </div>

                    <div className="page-size-selector">
                      <span>Rows per page:</span>
                      <select
                        value={studioPageSize}
                        onChange={(e) => {
                          const size = Number(e.target.value);
                          setStudioPageSize(size);
                          setStudioPage(1);
                          fetchPreview(1, size);
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    {canUndo && (
                      <button className="btn-studio-undo" onClick={handleUndo}>
                        <RotateCcw size={13} />
                        <span>Undo Last Transformation</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="studio-table-scroll-container">
                  {isStudioLoading ? (
                    <div className="table-loading-overlay">
                      <div className="pulse-orbit-ring"></div>
                      <span>Loading table records...</span>
                    </div>
                  ) : previewData && filteredStudioRows.length > 0 ? (
                    <table className="studio-interactive-table">
                      <thead>
                        <tr>
                          <th className="th-row-num">#</th>
                          {previewData.columns.map((col, idx) => (
                            <th key={idx}>
                              <div className="th-col-content">
                                <span>{col.name}</span>
                                <span className="th-type-indicator">{col.type}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudioRows.map((row, rIdx) => {
                          const rowNum = (previewData.page - 1) * previewData.page_size + rIdx + 1;
                          return (
                            <tr key={rIdx} className="table-row-hoverable">
                              <td className="td-row-num">{rowNum}</td>
                              {previewData.columns.map((col, cIdx) => {
                                const val = row[col.name];
                                const isNull = val === null || val === undefined || val === "";
                                return (
                                  <td key={cIdx} className={isNull ? "td-null-cell" : "td-data-cell"}>
                                    {isNull ? <span className="null-tag">N/A</span> : String(val)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="table-no-results">
                      <span>{tableSearch ? `No records matching "${tableSearch}" on this page.` : "No records found."}</span>
                    </div>
                  )}
                </div>

                {previewData && (
                  <div className="studio-pagination-footer">
                    <span className="pagination-info-text">
                      Showing <b>{((previewData.page - 1) * previewData.page_size) + 1}</b> to <b>{Math.min(previewData.page * previewData.page_size, previewData.total_rows)}</b> of <b>{previewData.total_rows.toLocaleString()}</b> records
                    </span>

                    <div className="pagination-controls-row">
                      <button
                        className="btn-page-nav"
                        disabled={previewData.page <= 1}
                        onClick={() => {
                          const p = previewData.page - 1;
                          setStudioPage(p);
                          fetchPreview(p, studioPageSize);
                        }}
                      >
                        <ChevronLeft size={14} />
                        <span>Previous</span>
                      </button>

                      <span className="page-count-indicator">
                        Page <b>{previewData.page}</b> of <b>{previewData.total_pages}</b>
                      </span>

                      <button
                        className="btn-page-nav"
                        disabled={previewData.page >= previewData.total_pages}
                        onClick={() => {
                          const p = previewData.page + 1;
                          setStudioPage(p);
                          fetchPreview(p, studioPageSize);
                        }}
                      >
                        <span>Next</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'eda' && (
          <div className="eda-view-container">
            {!datasetMeta ? (
              <div className="empty-studio-screen">
                <Activity size={48} className="empty-icon-art" />
                <h3>No Dataset Loaded</h3>
                <p>Upload a CSV or Excel dataset to view the health audit.</p>
                <button className="btn-upload-action-pill" onClick={() => fileRef.current?.click()} style={{ marginTop: '16px' }}>
                  <Plus size={14} />
                  <span>Upload Dataset</span>
                </button>
              </div>
            ) : isEdaLoading ? (
              <div className="eda-loading-screen">
                <div className="pulse-orbit-ring"></div>
                <h3>Auditing Data Quality...</h3>
                <p>Checking missing cells, duplicate records, and feature types.</p>
              </div>
            ) : edaData ? (
              <div className="eda-scroll-content">
                <div className="eda-hero-banner">
                  <div className="eda-hero-info">
                    <div className="hero-badge-row">
                      <span className="eda-pill-badge">Quality Audit</span>
                      <span className="engine-badge-subtle">⚡ Automated Audit</span>
                    </div>
                    <h2>{edaData.filename}</h2>
                    <p>Comprehensive data profile and hygiene summary</p>
                  </div>
                  <div className="health-score-capsule">
                    <div className="health-score-val">{healthScore}%</div>
                    <div className="health-score-meta">
                      <span className="health-label">Data Health Rating</span>
                      <span className="health-status-sub">{healthScore > 90 ? "Excellent Quality" : healthScore > 75 ? "Good Condition" : "Needs Cleaning"}</span>
                    </div>
                  </div>
                </div>

                <div className="eda-kpi-grid">
                  <div className="eda-kpi-card">
                    <div className="kpi-icon-row">
                      <div className="kpi-icon-badge bg-indigo-subtle">
                        <Database size={16} className="text-indigo" />
                      </div>
                      <span className="kpi-label">Total Rows</span>
                    </div>
                    <span className="kpi-value">{edaData.total_rows.toLocaleString()}</span>
                    <span className="kpi-subtext">Total active records</span>
                  </div>

                  <div className="eda-kpi-card">
                    <div className="kpi-icon-row">
                      <div className="kpi-icon-badge bg-purple-subtle">
                        <Columns size={16} className="text-purple" />
                      </div>
                      <span className="kpi-label">Total Columns</span>
                    </div>
                    <span className="kpi-value">{edaData.total_cols}</span>
                    <span className="kpi-subtext">Attributes per record</span>
                  </div>

                  <div className="eda-kpi-card">
                    <div className="kpi-icon-row">
                      <div className="kpi-icon-badge bg-amber-subtle">
                        <AlertCircle size={16} className={edaData.missing_cells > 0 ? "text-amber" : "text-emerald"} />
                      </div>
                      <span className="kpi-label">Missing Values</span>
                    </div>
                    <span className={`kpi-value ${edaData.missing_cells > 0 ? 'text-amber' : 'text-emerald'}`}>
                      {edaData.missing_cells.toLocaleString()}
                    </span>
                    <span className="kpi-subtext">{edaData.missing_pct}% of total cells</span>
                  </div>

                  <div className="eda-kpi-card">
                    <div className="kpi-icon-row">
                      <div className="kpi-icon-badge bg-emerald-subtle">
                        <CheckCircle2 size={16} className={edaData.duplicate_rows > 0 ? "text-rose" : "text-emerald"} />
                      </div>
                      <span className="kpi-label">Duplicate Rows</span>
                    </div>
                    <span className={`kpi-value ${edaData.duplicate_rows > 0 ? 'text-rose' : 'text-emerald'}`}>
                      {edaData.duplicate_rows.toLocaleString()}
                    </span>
                    <span className="kpi-subtext">{edaData.duplicate_rows === 0 ? "Zero duplicates" : "Duplicates found"}</span>
                  </div>
                </div>

                <div className="eda-section-box">
                  <div className="section-header-row">
                    <Columns size={16} className="text-indigo" />
                    <h4>Feature Types Breakdown</h4>
                    <div className="types-badge-strip">
                      <span className="badge-type-pill numeric">{edaData.numeric_count} Numeric</span>
                      <span className="badge-type-pill categorical">{edaData.categorical_count} Categorical</span>
                      <span className="badge-type-pill datetime">{edaData.datetime_count} Datetime</span>
                    </div>
                  </div>

                  {edaData.columns_info && edaData.columns_info.length > 0 && (
                    <div className="columns-quality-table-wrapper">
                      <table className="columns-quality-table">
                        <thead>
                          <tr>
                            <th>Column Name</th>
                            <th>Inferred Feature Type</th>
                            <th>Data Type</th>
                            <th>Missing Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {edaData.columns_info.map((col, idx) => (
                            <tr key={idx}>
                              <td className="col-name-cell"><b>{col.name}</b></td>
                              <td>
                                <span className={`badge-type-pill ${col.type}`}>
                                  {col.type}
                                </span>
                              </td>
                              <td className="col-raw-type">{col.raw_type}</td>
                              <td>
                                <span className={col.missing > 0 ? "text-amber font-semibold" : "text-emerald"}>
                                  {col.missing === 0 ? "0 (Clean)" : `${col.missing} missing`}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="eda-section-box">
                  <div className="section-header-row">
                    <AlertTriangle size={16} className="text-amber" />
                    <h4>Outlier Detection (1.5x IQR)</h4>
                  </div>
                  {edaData.outlier_columns && edaData.outlier_columns.length > 0 ? (
                    <div className="outliers-summary-flow">
                      <p className="outlier-desc">
                        The following numerical columns contain extreme values identified beyond 1.5 times the interquartile range:
                      </p>
                      <div className="outliers-cards-grid">
                        {edaData.outlier_columns.map((item, idx) => (
                          <div key={idx} className="outlier-column-card">
                            <span className="outlier-card-col-name">⚠️ {item.column}</span>
                            <span className="outlier-card-count">{item.count} outlier{item.count > 1 ? 's' : ''} detected</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="clean-status-box">
                      <CheckCircle2 size={16} className="text-emerald" />
                      <span>No statistical outliers detected across numerical columns. All values within normal IQR bounds.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
