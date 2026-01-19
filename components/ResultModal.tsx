import React, { useEffect, useState } from 'react';
import { VerificationResult, ScanStatus, ColumnMapping } from '../types';
import { CheckCircle, XCircle, AlertTriangle, User, Users, Calendar, Mail, DollarSign } from 'lucide-react';
import { generateWelcomeMessage } from '../services/geminiService';

interface ResultModalProps {
  result: VerificationResult;
  mapping: ColumnMapping;
  onDismiss: () => void;
}

const ResultModal: React.FC<ResultModalProps> = ({ result, mapping, onDismiss }) => {
  const [welcomeMsg, setWelcomeMsg] = useState<string>("");

  useEffect(() => {
    if (result.status === ScanStatus.SUCCESS && result.data) {
        generateWelcomeMessage(result.data).then(setWelcomeMsg);
    }
  }, [result]);

  const getPaymentStatus = (val: unknown) => {
    const s = String(val).toLowerCase().trim();
    if (['paid', 'done', 'yes', 'true', 'completed', 'received'].includes(s)) {
        return { isPaid: true, label: "PAID", color: "text-green-400 bg-green-900/30 border-green-700" };
    }
    return { isPaid: false, label: String(val) || "PENDING", color: "text-red-400 bg-red-900/30 border-red-700" };
  };

  const renderContent = () => {
    switch (result.status) {
      case ScanStatus.SUCCESS:
        // Use result.data! safely here since SUCCESS implies data exists
        const data = result.data!; 
        const paymentInfo = mapping.paymentColumn ? getPaymentStatus(data[mapping.paymentColumn]) : { isPaid: true, label: "N/A", color: "text-gray-400 bg-gray-800" };

        return (
          <div className="w-full">
            <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center ring-4 ring-green-500/10 animate-bounce-short">
                    <CheckCircle className="text-green-500" size={48} />
                </div>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-1">Verified</h2>
            <p className="text-green-400 font-medium mb-6 text-sm">{welcomeMsg || "Identity Confirmed"}</p>
            
            <div className="w-full bg-gray-800/80 rounded-xl border border-gray-700 overflow-hidden mb-6">
                {/* Header with Name */}
                <div className="p-4 border-b border-gray-700 bg-gray-800 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0">
                        <User size={24} />
                    </div>
                    <div className="text-left overflow-hidden">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Participant</p>
                        <p className="text-xl font-bold text-white truncate">{String(data[mapping.nameColumn])}</p>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="p-4 space-y-3">
                    {/* Team */}
                    {mapping.teamColumn && (
                        <div className="flex items-center gap-3 text-left">
                            <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-gray-400">
                                <Users size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Team</p>
                                <p className="text-sm text-gray-200 font-medium">{String(data[mapping.teamColumn] || 'N/A')}</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Event */}
                    {mapping.eventColumn && (
                        <div className="flex items-center gap-3 text-left">
                            <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-gray-400">
                                <Calendar size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Event</p>
                                <p className="text-sm text-gray-200 font-medium">{String(data[mapping.eventColumn] || 'N/A')}</p>
                            </div>
                        </div>
                    )}

                    {/* Email */}
                    {mapping.emailColumn && (
                        <div className="flex items-center gap-3 text-left">
                            <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-gray-400">
                                <Mail size={16} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Email</p>
                                <p className="text-sm text-gray-200 truncate">{String(data[mapping.emailColumn] || 'N/A')}</p>
                            </div>
                        </div>
                    )}

                    {/* Payment Status */}
                    {mapping.paymentColumn && (
                        <div className={`mt-2 p-3 rounded-lg border flex items-center justify-between ${paymentInfo.color}`}>
                            <div className="flex items-center gap-2">
                                <DollarSign size={18} />
                                <span className="font-bold text-sm uppercase">Payment</span>
                            </div>
                            <span className="font-bold text-lg">{paymentInfo.label}</span>
                        </div>
                    )}
                </div>
            </div>
          </div>
        );

      case ScanStatus.DUPLICATE:
        return (
          <>
            <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mb-4 ring-4 ring-orange-500/10">
              <AlertTriangle className="text-orange-500" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Already Scanned</h2>
            <p className="text-orange-400 mb-6 text-center text-sm">
              Scanned at {result.timestamp.toLocaleTimeString()}
            </p>
            {result.data && (
                 <div className="w-full bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6 text-left">
                    <p className="text-xs text-gray-500 uppercase font-bold">Participant</p>
                    <p className="text-white font-bold text-lg">{String(result.data[mapping.nameColumn])}</p>
                 </div>
            )}
          </>
        );

      case ScanStatus.NOT_FOUND:
      default:
        return (
          <>
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4 ring-4 ring-red-500/10">
              <XCircle className="text-red-500" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-red-400 mb-6 text-center max-w-xs text-sm">
              ID <span className="font-mono bg-red-900/30 px-2 py-0.5 rounded text-red-200 mx-1">{result.scannedValue}</span> not found.
            </p>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all" onClick={onDismiss}>
      <div 
        className="bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-700 p-6 flex flex-col items-center text-center transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {renderContent()}
        
        <button 
          onClick={onDismiss}
          className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all active:scale-95"
        >
          Scan Next
        </button>
      </div>
    </div>
  );
};

export default ResultModal;