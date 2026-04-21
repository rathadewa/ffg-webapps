import { useState, useRef, useCallback } from "react";
import { BASE_PATH } from "../config";
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader } from "lucide-react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadResult {
  inserted: number;
  skipped: number;
}

interface UploaderState {
  file: File | null;
  status: UploadStatus;
  result: UploadResult | null;
  error: string;
  dragging: boolean;
}

const INIT: UploaderState = { file: null, status: "idle", result: null, error: "", dragging: false };

function FileUploader({
  label,
  endpoint,
  color,
}: {
  label: string;
  endpoint: string;
  color: "blue" | "purple";
}) {
  const [state, setState] = useState<UploaderState>(INIT);
  const inputRef = useRef<HTMLInputElement>(null);

  const accent = color === "blue"
    ? { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.3)", icon: "#3b82f6", hover: "rgba(59,130,246,0.14)" }
    : { bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.3)", icon: "#a855f7", hover: "rgba(168,85,247,0.14)" };

  const setFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setState((s) => ({ ...s, file: null, error: "Hanya file .xlsx atau .xls yang diizinkan.", status: "error" }));
      return;
    }
    setState({ ...INIT, file: f });
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState((s) => ({ ...s, dragging: false }));
    setFile(e.dataTransfer.files[0] ?? null);
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setState((s) => ({ ...s, dragging: true })); };
  const onDragLeave = () => setState((s) => ({ ...s, dragging: false }));

  const clearFile = () => {
    setState(INIT);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!state.file) return;
    setState((s) => ({ ...s, status: "uploading", error: "", result: null }));

    try {
      const form = new FormData();
      form.append("file", state.file);
      const token = localStorage.getItem("session_token") ?? "";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json() as { data?: UploadResult; error?: string };
      if (!res.ok) {
        setState((s) => ({ ...s, status: "error", error: json.error ?? "Upload gagal." }));
        return;
      }
      setState((s) => ({ ...s, status: "success", result: json.data ?? null }));
    } catch {
      setState((s) => ({ ...s, status: "error", error: "Tidak dapat terhubung ke server." }));
    }
  };

  const isUploading = state.status === "uploading";

  return (
    <div className="uploader-card">
      <div className="uploader-label">
        <FileSpreadsheet size={16} style={{ color: accent.icon }} />
        <span>{label}</span>
      </div>

      {/* Drop zone */}
      {!state.file && state.status !== "success" && (
        <div
          className={`drop-zone${state.dragging ? " dragging" : ""}`}
          style={{
            background: state.dragging ? accent.hover : accent.bg,
            borderColor: accent.border,
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={28} style={{ color: accent.icon, opacity: 0.7 }} />
          <p className="drop-zone-title">Klik atau seret file Excel ke sini</p>
          <p className="drop-zone-hint">Format yang didukung: .xlsx, .xls</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {/* File selected */}
      {state.file && state.status !== "success" && (
        <div className="upload-file-row">
          <FileSpreadsheet size={18} style={{ color: accent.icon, flexShrink: 0 }} />
          <div className="upload-file-info">
            <span className="upload-file-name">{state.file.name}</span>
            <span className="upload-file-size">{(state.file.size / 1024).toFixed(1)} KB</span>
          </div>
          {!isUploading && (
            <button className="upload-file-clear" onClick={clearFile} aria-label="Hapus file">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {state.status === "error" && (
        <div className="upload-alert upload-alert-error">
          <AlertCircle size={14} />
          <span>{state.error}</span>
        </div>
      )}

      {/* Success */}
      {state.status === "success" && state.result && (
        <>
          <div className="upload-alert upload-alert-success">
            <CheckCircle size={14} />
            <span>
              Upload berhasil — <strong>{state.result.inserted}</strong> baris diimpor
              {state.result.skipped > 0 && <>, <strong>{state.result.skipped}</strong> baris dilewati</>}.
            </span>
          </div>
          <button className="upload-retry" onClick={clearFile}>
            Upload file lain
          </button>
        </>
      )}

      {/* Upload button */}
      {state.file && state.status !== "success" && (
        <button
          className="btn-upload"
          style={{ background: accent.icon }}
          onClick={handleUpload}
          disabled={isUploading}
        >
          {isUploading
            ? <><Loader size={14} className="spin" /> Mengimpor…</>
            : <><Upload size={14} /> Upload & Impor</>}
        </button>
      )}
    </div>
  );
}

export default function UploadView() {
  return (
    <>
      <div className="page-head">
        <div className="page-head-left">
          <span className="page-head-title">Upload Data</span>
          <span className="page-head-sub">Impor data dari file Excel ke database</span>
        </div>
      </div>

      <div className="uploader-grid" style={{ marginTop: 16 }}>
        <FileUploader
          label="Upload FFG IndiHome"
          endpoint={`${BASE_PATH}/api/upload/indihome`}
          color="blue"
        />
        <FileUploader
          label="Upload FFG IndiBiz"
          endpoint={`${BASE_PATH}/api/upload/indibiz`}
          color="purple"
        />
      </div>
    </>
  );
}
