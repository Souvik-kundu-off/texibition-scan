import React from 'react';
import { ExcelRow, ScanLog, ColumnMapping } from '../types';
import { CheckCircle, XCircle, AlertTriangle, FileSpreadsheet, Search, Download } from 'lucide-react';

interface DashboardProps {
  fileName: string;
  data: ExcelRow[];
  logs: ScanLog[];
  mapping: ColumnMapping;
  onScanClick: () => void;
  onReset: () => void;
  onDownload: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ fileName, data, logs, mapping, onScanClick, onReset, onDownload }) => {
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="text-green-500" size={18} />;
      case 'NOT_FOUND': return <XCircle className="text-red-500" size={18} />;
      case 'DUPLICATE': return <AlertTriangle className="text-orange-500" size={18} />;
      default: return <Search className="text-gray-500" size={18} />;
    }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full p-4 gap-6">
      {/* Header Card */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="text-green-400" size={20} />
            <h2 className="text-lg font-bold text-white">{fileName}</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-2">
            <span className="bg-gray-700 px-2 py-1 rounded border border-gray-600">ID: {mapping.idColumn}</span>
            {mapping.teamColumn && <span className="bg-gray-700 px-2 py-1 rounded border border-gray-600">Team: {mapping.teamColumn}</span>}
            {mapping.paymentColumn && <span className="bg-gray-700 px-2 py-1 rounded border border-gray-600">Payment: {mapping.paymentColumn}</span>}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
            <button 
                onClick={onReset}
                className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition font-medium text-sm"
            >
                Change File
            </button>
            <button 
                onClick={onDownload}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/50 transition transform active:scale-95 flex items-center gap-2 text-sm"
            >
                <Download size={18} />
                Download Report
            </button>
            <button 
                onClick={onScanClick}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/50 transition transform active:scale-95 flex items-center gap-2"
            >
                <Search size={18} />
                Scan QR
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Recent Scans Log */}
        <div className="lg:col-span-3 bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                <h3 className="font-semibold text-white">Verification Log</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p>No scans yet. Click "Scan QR" to begin.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">Result</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3 hidden sm:table-cell">Team</th>
                                <th className="px-4 py-3 hidden md:table-cell">Email</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {logs.slice().reverse().map((log) => (
                                <tr key={log.id} className="hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-4 font-mono text-gray-400 whitespace-nowrap">
                                        {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(log.status)}
                                            <span className={`font-bold text-xs ${
                                                log.status === 'SUCCESS' ? 'text-green-400' : 
                                                log.status === 'DUPLICATE' ? 'text-orange-400' : 'text-red-400'
                                            }`}>
                                                {log.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-white font-medium">
                                        {log.data ? String(log.data[mapping.nameColumn] || 'N/A') : '-'}
                                    </td>
                                    <td className="px-4 py-4 text-gray-300 hidden sm:table-cell">
                                        {log.data && mapping.teamColumn ? String(log.data[mapping.teamColumn]) : '-'}
                                    </td>
                                    <td className="px-4 py-4 text-gray-400 text-xs hidden md:table-cell truncate max-w-[150px]">
                                        {log.data && mapping.emailColumn ? String(log.data[mapping.emailColumn]) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* Stats / Mini Summary */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 flex flex-col gap-6 h-fit">
            <h3 className="font-semibold text-white border-b border-gray-700 pb-2">Session Stats</h3>
            
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase font-semibold">Verified</p>
                    <p className="text-3xl font-bold text-green-400">{logs.filter(l => l.status === 'SUCCESS').length}</p>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase font-semibold">Issues</p>
                    <p className="text-3xl font-bold text-red-400">{logs.filter(l => l.status !== 'SUCCESS').length}</p>
                </div>
            </div>

            <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800/50">
                <div className="flex items-start gap-3">
                    <div className="mt-1 min-w-[20px]">✨</div>
                    <p className="text-xs text-blue-200">
                        Checking for: <br/>
                        <span className="font-semibold">• {mapping.teamColumn || "Team (Auto)"}</span><br/>
                        <span className="font-semibold">• {mapping.eventColumn || "Event (Auto)"}</span><br/>
                        <span className="font-semibold">• Payment Status</span>
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;