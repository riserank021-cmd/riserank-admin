import { useState, useRef } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export default function Import() {
  const { showToast } = useToast();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null); // { imported, errors }
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      showToast('Only CSV files are accepted', 'error');
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      showToast('File too large. Max size is 2MB', 'error');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/import/questions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult({ success: true, imported: data.data?.imported ?? 0, message: data.message });
      showToast(`${data.data?.imported ?? 0} questions imported`, 'success');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Import failed';
      const errors = err?.response?.data?.errors ?? [];
      setResult({ success: false, message: msg, errors });
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const token = localStorage.getItem('rr_admin_token');
    const url = `${BASE_URL}/import/template`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'questions-template.csv');
    // Pass auth header via fetch blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        a.href = URL.createObjectURL(blob);
        a.click();
      })
      .catch(() => showToast('Could not download template', 'error'));
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Bulk Import Questions</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload a CSV file to import up to 500 questions at once</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <p className="font-semibold mb-2">📋 Before you upload:</p>
        <ul className="space-y-1 text-blue-700 list-disc pl-4">
          <li>Download and use the official template below</li>
          <li>All rows are validated before any questions are saved (all-or-nothing)</li>
          <li>Imported questions are saved as <strong>DRAFT</strong> — publish them individually</li>
          <li>Max 500 rows and 2MB per file</li>
          <li>Required columns: <code className="bg-blue-100 px-1 rounded">question_en</code>, <code className="bg-blue-100 px-1 rounded">optionA_en</code> through <code className="bg-blue-100 px-1 rounded">optionD_en</code>, <code className="bg-blue-100 px-1 rounded">correct_option</code>, <code className="bg-blue-100 px-1 rounded">category</code></li>
        </ul>
      </div>

      {/* Template download */}
      <button
        onClick={downloadTemplate}
        className="flex items-center gap-2 w-full border border-dashed border-gray-300 rounded-xl p-4 mb-5 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
      >
        <span className="text-xl">📥</span>
        <div className="text-left">
          <div className="font-medium">Download CSV Template</div>
          <div className="text-xs text-gray-400">questions-template.csv — includes all required and optional columns</div>
        </div>
      </button>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all mb-5 ${
          dragOver
            ? 'border-primary-400 bg-primary-50'
            : file
            ? 'border-green-400 bg-green-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
        {file ? (
          <>
            <div className="text-3xl mb-2">📄</div>
            <div className="font-medium text-green-700">{file.name}</div>
            <div className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB — click to change</div>
          </>
        ) : (
          <>
            <div className="text-3xl mb-2">☁️</div>
            <div className="font-medium text-gray-700">Drag & drop your CSV here</div>
            <div className="text-xs text-gray-400 mt-1">or click to browse</div>
          </>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {uploading ? '⏳ Importing…' : '⬆️ Import Questions'}
      </button>

      {/* Result */}
      {result && (
        <div className={`mt-5 rounded-xl p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className={`font-semibold text-sm mb-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.success ? `✅ ${result.imported} questions imported as DRAFT` : `❌ Import failed`}
          </div>
          <p className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>{result.message}</p>
          {result.errors?.length > 0 && (
            <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
              {result.errors.map((e, i) => (
                <div key={i} className="text-xs text-red-600 bg-red-100 rounded px-2 py-1">
                  Row {e.row}: {e.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
