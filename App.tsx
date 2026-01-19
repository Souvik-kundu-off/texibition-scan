import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ExcelRow, ColumnMapping, ScanLog, ScanStatus, VerificationResult } from './types';
import { analyzeColumns } from './services/geminiService';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import ResultModal from './components/ResultModal';
import { UploadCloud, FileSpreadsheet, Sparkles, Lock, User, Eye, EyeOff } from 'lucide-react';

// Hardcoded Credentials Mapping
const VALID_CREDENTIALS: { [key: string]: string } = {
  "free fire": "free fire123",
  "bgmi": "bgmi123",
  "pes": "pes123",
  "valorant": "valorant123",
  "blitz": "blitz123",
  "xibit": "xibit123",
  "bluster": "bluster123",
  "prompter": "prompter123",
  "architect": "architect123"
};

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // App State
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [mapping, setMapping] = useState<ColumnMapping>({ 
    idColumn: '', 
    nameColumn: '',
    emailColumn: '',
    teamColumn: '',
    eventColumn: '',
    paymentColumn: ''
  });
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [currentResult, setCurrentResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Set of verified IDs to track duplicates in this session
  const verifiedIds = useRef<Set<string>>(new Set());

  // -- Auth Handlers --

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Check if the username exists in credentials and if the password matches
    const validPassword = VALID_CREDENTIALS[usernameInput]; // Case-sensitive exact match
    
    if (validPassword && validPassword === passwordInput) {
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Invalid username or password");
    }
  };

  // -- App Handlers --

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value so same file can be selected again if needed
    e.target.value = '';

    setLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;

        // SAFE IMPORT HANDLING:
        // Handle variations in how the XLSX library is bundled (ESM vs CJS)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lib: any = XLSX;
        const readFn = lib.read || (lib.default && lib.default.read);
        const utilsFn = lib.utils || (lib.default && lib.default.utils);

        if (!readFn || !utilsFn) {
           throw new Error("XLSX library could not be initialized. Please refresh the page.");
        }

        const wb = readFn(arrayBuffer, { type: 'array' });
        
        if (wb.SheetNames.length === 0) {
            throw new Error("The Excel file contains no sheets.");
        }

        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        const data = utilsFn.sheet_to_json(ws) as ExcelRow[];

        if (data && data.length > 0) {
            // Get headers from the first object keys
            const headers = Object.keys(data[0]);
            
            // Use Gemini to guess the columns
            const autoMapping = await analyzeColumns(headers, data[0]);
            
            setMapping(autoMapping);
            setExcelData(data);
            setLogs([]); // Clear logs on new file
            verifiedIds.current = new Set();
        } else {
            alert("The uploaded Excel file appears to be empty or could not be parsed.");
            setFileName("");
        }
      } catch (err: any) {
        console.error("Error parsing excel", err);
        alert(`Failed to load file: ${err.message || "Unknown error"}`);
        setFileName("");
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
        alert("Error reading the file from disk.");
        setLoading(false);
        setFileName("");
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDownloadReport = () => {
    if (!excelData.length) {
      alert("No data to export.");
      return;
    }

    try {
      // 1. Create a map of verified IDs -> Check-in Timestamp
      const checkInMap = new Map<string, string>();
      logs.forEach(log => {
          if (log.status === ScanStatus.SUCCESS && log.data) {
               const idVal = String(log.data[mapping.idColumn]).trim();
               // Only store the first successful scan time (or overwrite if you prefer last)
               if (!checkInMap.has(idVal)) {
                  checkInMap.set(idVal, log.timestamp.toLocaleString());
               }
          }
      });

      // 2. Merge original data with attendance status
      const reportData = excelData.map(row => {
          const idVal = String(row[mapping.idColumn]).trim();
          const isPresent = checkInMap.has(idVal);
          
          return {
              ...row,
              "Attendance Status": isPresent ? "Present" : "Absent",
              "Check-in Time": isPresent ? checkInMap.get(idVal) : ""
          };
      });

      // 3. Generate and download Excel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib: any = XLSX;
      const utilsFn = lib.utils || (lib.default && lib.default.utils);
      const writeFn = lib.writeFile || (lib.default && lib.default.writeFile);

      if (!utilsFn || !writeFn) {
        throw new Error("XLSX export functions not found.");
      }

      const ws = utilsFn.json_to_sheet(reportData);
      const wb = utilsFn.book_new();
      utilsFn.book_append_sheet(wb, ws, "Attendance Report");
      
      const fileNameClean = fileName.replace(/\.[^/.]+$/, "");
      writeFn(wb, `${fileNameClean}_Attendance.xlsx`);

    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to download report.");
    }
  };

  const findMatch = (text: string): { match: ExcelRow | undefined, matchedId: string } => {
     const normalizedText = text.trim();
     
     // 1. Try Exact ID Match
     let match = excelData.find(row => {
         // eslint-disable-next-line eqeqeq
         return String(row[mapping.idColumn]).trim() == normalizedText;
     });
     if (match) return { match, matchedId: normalizedText };

     // 2. Try Email Match (if mapped)
     if (mapping.emailColumn) {
        match = excelData.find(row => {
            return String(row[mapping.emailColumn]).trim().toLowerCase() === normalizedText.toLowerCase();
        });
        if (match) return { match, matchedId: normalizedText };
     }

     // 3. Smart Parse: If the scanned text looks like a row (CSV/TSV/Space separated)
     // delimiters: tab, pipe, comma
     const delimiters = ['\t', '|', ','];
     for (const del of delimiters) {
        if (normalizedText.includes(del)) {
            const parts = normalizedText.split(del).map(s => s.trim());
            
            // Try matching any part against ID
            for (const part of parts) {
                if (!part) continue;
                const partMatch = excelData.find(row => {
                    // eslint-disable-next-line eqeqeq
                    return String(row[mapping.idColumn]).trim() == part;
                });
                if (partMatch) return { match: partMatch, matchedId: part };
            }
            
            // Try matching any part against Email
            if (mapping.emailColumn) {
                for (const part of parts) {
                    if (!part.includes('@')) continue; // optimization
                    const emailMatch = excelData.find(row => {
                        return String(row[mapping.emailColumn]).trim().toLowerCase() === part.toLowerCase();
                    });
                    if (emailMatch) return { match: emailMatch, matchedId: part };
                }
            }
        }
     }

     return { match: undefined, matchedId: normalizedText };
  };

  const handleScan = (scannedText: string) => {
    setIsScanning(false);
    
    const timestamp = new Date();
    const { match, matchedId } = findMatch(scannedText);
    
    // Check for Duplicate based on the RESOLVED ID (not necessarily the raw scanned text)
    // We use the ID from the matched row if available, otherwise the scanned text
    const uniqueKey = match ? String(match[mapping.idColumn]).trim() : matchedId;

    if (verifiedIds.current.has(uniqueKey)) {
        const result: VerificationResult = {
            status: ScanStatus.DUPLICATE,
            scannedValue: matchedId,
            timestamp,
            data: match,
            message: "Already verified."
        };
        handleResult(result);
        return;
    }

    if (match) {
        verifiedIds.current.add(uniqueKey);
        const result: VerificationResult = {
            status: ScanStatus.SUCCESS,
            scannedValue: matchedId,
            timestamp,
            data: match
        };
        handleResult(result);
    } else {
        const result: VerificationResult = {
            status: ScanStatus.NOT_FOUND,
            scannedValue: scannedText.length > 30 ? scannedText.substring(0, 30) + "..." : scannedText,
            timestamp,
            message: "ID not found in list."
        };
        handleResult(result);
    }
  };

  const handleResult = (result: VerificationResult) => {
    setCurrentResult(result);
    // Add to logs
    setLogs(prev => [...prev, { ...result, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const resetSession = () => {
    setExcelData([]);
    setFileName("");
    setLogs([]);
    verifiedIds.current.clear();
  };

  // -- Render: Login Screen --

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Texibition</span>
                <span className="ml-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">2K26</span>
              </h1>
              <p className="text-gray-400">Please sign in to continue</p>
          </div>

          <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
             <form onSubmit={handleLogin} className="space-y-6">
                <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                   <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <User size={18} className="text-gray-500" />
                     </div>
                     <input 
                       type="text" 
                       value={usernameInput}
                       onChange={(e) => setUsernameInput(e.target.value)}
                       className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-10 pr-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-600"
                       placeholder="Enter username"
                       autoFocus
                     />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                   <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Lock size={18} className="text-gray-500" />
                     </div>
                     <input 
                       type={showPassword ? "text" : "password"}
                       value={passwordInput}
                       onChange={(e) => setPasswordInput(e.target.value)}
                       className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-10 pr-10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-600"
                       placeholder="Enter password"
                     />
                     <button 
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                     >
                       {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                     </button>
                   </div>
                </div>

                {loginError && (
                  <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm text-center">
                    {loginError}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/30 transform active:scale-95 flex items-center justify-center gap-2"
                >
                  Sign In
                </button>
             </form>

             <div className="mt-6 text-center text-xs text-gray-500">
                Annual Tech Fest of Brainware University
             </div>
          </div>
        </div>
      </div>
    );
  }

  // -- Render: Main App --

  if (excelData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        {/* Logout button for Upload Screen */}
        <button 
           onClick={() => setIsAuthenticated(false)} 
           className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm font-medium transition-colors"
        >
          Sign Out
        </button>

        <div className="max-w-xl w-full">
           <div className="text-center mb-10">
              <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Texibition</span>
                <span className="ml-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">2K26</span>
              </h1>
              <p className="text-gray-400 text-lg">
                Secure QR Code Verification & Event Check-in
              </p>
           </div>

           <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
              
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-blue-400 shadow-inner">
                   {loading ? (
                     <Sparkles className="animate-spin" size={32} />
                   ) : (
                     <UploadCloud size={32} />
                   )}
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-2">Upload Guest List</h2>
              <p className="text-gray-400 mb-8 text-sm">
                Upload an Excel (.xlsx) file. AI will automatically detect ID, Name, Team, Event, Email, and Payment columns.
              </p>

              <label className="block w-full">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  disabled={loading}
                />
                <div className="cursor-pointer w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all transform active:scale-95 shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2">
                    {loading ? (
                       <span>Analyzing File...</span>
                    ) : (
                       <>
                         <FileSpreadsheet size={20} />
                         <span>Select Excel File</span>
                       </>
                    )}
                </div>
              </label>

              <div className="mt-6 flex justify-center gap-4 text-xs text-gray-500">
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Auto-Mapping</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Smart Scan</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
        {/* Navbar */}
        <header className="bg-gray-800 border-b border-gray-700 p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Brand Logo / Text */}
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-black">T</div>
                    <h1 className="text-xl font-black uppercase tracking-tight flex gap-1">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Texibition</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">2K26</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                   <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-700/50 rounded-full border border-gray-700">
                      <Sparkles size={14} className="text-yellow-400"/>
                      <span>AI Active</span>
                   </div>
                   <button onClick={() => setIsAuthenticated(false)} className="hover:text-white transition-colors">
                      Sign Out
                   </button>
                </div>
            </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden flex flex-col pt-6">
            <Dashboard 
                fileName={fileName}
                data={excelData}
                logs={logs}
                mapping={mapping}
                onScanClick={() => setIsScanning(true)}
                onReset={resetSession}
                onDownload={handleDownloadReport}
            />
        </main>

        {/* Overlays */}
        {isScanning && (
            <Scanner 
                onScan={handleScan}
                onClose={() => setIsScanning(false)}
            />
        )}

        {currentResult && (
            <ResultModal 
                result={currentResult}
                mapping={mapping}
                onDismiss={() => {
                    setCurrentResult(null);
                    // Optionally reopen scanner automatically
                    // setIsScanning(true); 
                }}
            />
        )}
    </div>
  );
};

export default App;