import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import { X, Camera, Zap, ZapOff, RefreshCw, Check } from 'lucide-react';
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
  const [successFlash, setSuccessFlash] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const startScanner = async (cameraIndex = 0) => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        await html5QrCodeRef.current.stop();
      }

      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      
      if (devices && devices.length > 0) {
        let cameraId = devices[cameraIndex].id;
        
        // On first run, try to find back camera
        if (cameraIndex === 0) {
          const backCameraIndex = devices.findIndex(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear')
          );
          if (backCameraIndex !== -1) {
            cameraId = devices[backCameraIndex].id;
            setCurrentCameraIndex(backCameraIndex);
          }
        }

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ];

        const html5QrCode = new Html5Qrcode("reader", { 
          verbose: false,
          formatsToSupport: formatsToSupport
        });
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          cameraId,
          {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.7);
              return {
                width: qrboxSize,
                height: qrboxSize
              };
            },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (lastScannedRef.current === decodedText) return;
            
            lastScannedRef.current = decodedText;
            setLastScannedBarcode(decodedText);
            playBeep('success');
            setSuccessFlash(true);
            setTimeout(() => setSuccessFlash(false), 500);
            onScan(decodedText);

            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = setTimeout(() => {
              lastScannedRef.current = null;
            }, 1000);
          },
          (errorMessage) => {
            // Ignore common scan errors
          }
        );

        setIsScanning(true);
        
        // Check for torch support
        const videoElement = document.querySelector('#reader video') as HTMLVideoElement;
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          if (track && track.getCapabilities) {
            const capabilities = track.getCapabilities();
            // @ts-ignore
            if (capabilities.torch) {
              setHasTorch(true);
            } else {
              setHasTorch(false);
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

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    startScanner(nextIndex);
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
      if (html5QrCodeRef.current && html5QrCodeRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
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
            <div className={cn(
              "w-[250px] h-[250px] border-2 rounded-2xl relative transition-all duration-300",
              successFlash ? "border-green-500 scale-105" : "border-accent"
            )}>
              {/* Corner Accents */}
              <div className={cn("absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-lg transition-colors", successFlash ? "border-green-500" : "border-accent")}></div>
              <div className={cn("absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-lg transition-colors", successFlash ? "border-green-500" : "border-accent")}></div>
              <div className={cn("absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-lg transition-colors", successFlash ? "border-green-500" : "border-accent")}></div>
              <div className={cn("absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-lg transition-colors", successFlash ? "border-green-500" : "border-accent")}></div>
              
              {/* Scanning Line */}
              <div className={cn(
                "absolute top-0 left-0 right-0 h-0.5 shadow-[0_0_15px_rgba(255,100,0,0.8)] animate-[scan_2s_linear_infinite]",
                successFlash ? "bg-green-500" : "bg-accent/50"
              )}></div>
            </div>
          </div>

          {/* Success Message */}
          {successFlash && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg animate-in zoom-in duration-200">
              Scanned!
            </div>
          )}

          {/* Last Scanned Info */}
          {lastScannedBarcode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-mono border border-white/10 animate-in slide-in-from-bottom-2 duration-300">
              Last: {lastScannedBarcode}
            </div>
          )}

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
          <div className="flex gap-4 w-full">
            {cameras.length > 1 && (
              <button 
                onClick={switchCamera}
                className="w-14 h-14 rounded-2xl bg-secondary text-primary/40 flex items-center justify-center transition-all shadow-lg hover:bg-accent hover:text-white"
                title="Switch Camera"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            )}
            {hasTorch && (
              <button 
                onClick={toggleTorch}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                  isTorchOn ? "bg-accent text-white" : "bg-secondary text-primary/40"
                )}
                title="Toggle Flash"
              >
                {isTorchOn ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
              </button>
            )}
            <button 
              onClick={onClose}
              className="flex-1 h-14 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-accent transition-all"
            >
              <Check className="w-5 h-5" />
              Done Scanning
            </button>
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
