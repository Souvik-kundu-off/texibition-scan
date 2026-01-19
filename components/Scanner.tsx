import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { XCircle } from 'lucide-react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const scannerRegionId = 'html5qr-code-full-region';
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          // Use the back camera by default
          const cameraId = devices[0].id;
          
          const html5QrCode = new Html5Qrcode(scannerRegionId);
          html5QrCodeRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
               // Success callback
               // Stop scanning immediately after a successful scan to prevent duplicates
               if (html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
                 html5QrCode.stop().then(() => {
                    html5QrCodeRef.current = null;
                    onScan(decodedText);
                 }).catch(err => console.error("Failed to stop scanner", err));
               }
            },
            (errorMessage) => {
              // Ignore parse errors, they happen every frame no QR is detected
            }
          );
        } else {
          setError("No cameras found.");
        }
      } catch (err) {
        console.error("Error starting scanner", err);
        setError("Camera permission denied or error initializing.");
      }
    };

    startScanner();

    // Cleanup
    return () => {
      if (html5QrCodeRef.current?.getState() === Html5QrcodeScannerState.SCANNING) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white hover:text-red-400 transition-colors"
        >
          <XCircle size={32} />
        </button>
        
        <div className="p-4 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Scan QR Code</h2>
          <p className="text-gray-400 text-sm">Align the QR code within the frame</p>
        </div>

        <div className="relative w-full aspect-square bg-black">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center text-red-500 p-4 text-center">
                {error}
              </div>
            ) : (
              <div id={scannerRegionId} className="w-full h-full"></div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;