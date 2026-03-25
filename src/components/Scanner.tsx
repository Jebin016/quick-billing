import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Zap, ZapOff, RefreshCw } from 'lucide-react';
import { playBeep, cn } from '@/lib/utils';

interface ScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startScanner = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        // Prefer back camera
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        const cameraId = backCamera ? backCamera.id : devices[0].id;

        const html5QrCode = new Html5Qrcode("reader");
        html5QrCodeRef.current = html5QrCode;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ];

        await html5QrCode.start(
          cameraId,
          {
            fps: 20,
            qrbox: { width: 280, height: 200 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (lastScannedRef.current === decodedText) return;
            
            lastScannedRef.current = decodedText;
            playBeep('success');
            onScan(decodedText);

            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = setTimeout(() => {
              lastScannedRef.current = null;
            }, 2000);
          },
          (errorMessage) => {
            // Ignore common scan errors
          }
        );

        setIsScanning(true);
        
        // Check for torch support via the video element's track
        const videoElement = document.querySelector('#reader video') as HTMLVideoElement;
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          if (track && track.getCapabilities) {
            const capabilities = track.getCapabilities();
            // @ts-ignore
            if (capabilities.torch) {
              setHasTorch(true);
            }
          }
        }
      } else {
        setError("No cameras found");
      }
    } catch (err) {
      console.error("Scanner error:", err);
      setError("Failed to start camera. Please ensure permissions are granted.");
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const newState = !isTorchOn;
      // Use applyVideoConstraints on the running track
      const videoElement = document.querySelector('#reader video') as HTMLVideoElement;
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          await track.applyConstraints({
            // @ts-ignore
            advanced: [{ torch: newState }]
          });
          setIsTorchOn(newState);
        }
      }
    } catch (err) {
      console.error("Torch error:", err);
    }
  };

  useEffect(() => {
    startScanner();

    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Stop error:", err));
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] overflow-hidden w-full max-w-md shadow-2xl border border-white/10 relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold leading-none">Smart Scanner</h3>
              <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">Ready to scan</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="relative aspect-square bg-black">
          <div id="reader" className="w-full h-full"></div>
          
          {/* Custom Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[280px] h-[200px] border-2 border-accent rounded-2xl relative">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-accent rounded-tl-lg"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-accent rounded-tr-lg"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-accent rounded-bl-lg"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-accent rounded-br-lg"></div>
              
              {/* Scanning Line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent/50 shadow-[0_0_15px_rgba(255,100,0,0.8)] animate-[scan_2s_linear_infinite]"></div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-8 text-center">
              <RefreshCw className="w-12 h-12 text-accent mb-4 animate-spin" />
              <p className="font-bold mb-4">{error}</p>
              <button 
                onClick={() => { setError(null); startScanner(); }}
                className="px-6 py-2 bg-accent rounded-full font-bold text-sm"
              >
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-8 bg-white flex flex-col items-center gap-6">
          <div className="flex gap-4">
            {hasTorch && (
              <button 
                onClick={toggleTorch}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                  isTorchOn ? "bg-accent text-white" : "bg-secondary text-primary/40"
                )}
              >
                {isTorchOn ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
              </button>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-sm font-medium text-primary/60">
              Center the barcode within the frame
            </p>
            <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mt-2">
              Supports EAN, UPC, Code 128 & QR
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        #reader video {
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
}
