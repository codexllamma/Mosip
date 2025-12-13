"use client";

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from "html5-qrcode";
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Upload, 
  Scan, 
  X, 
  Camera, 
  QrCode,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function InjiVerify() {
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
        }).catch(err => console.error("Cleanup error:", err));
      }
    };
  }, [isScanning]);

  const handleScanSuccess = async (decodedText: string) => {
    await stopCamera();
    setLoading(true);
    setError(null);

    try {
        const response = await fetch(decodedText);
        const data = await response.json();
        
        if (response.ok && data.status !== 'NOT_FOUND' && data.status !== 'ERROR') {
            setScanResult({
                status: data.status,
                product: data.product?.type || "Unknown Product",
                batchNumber: data.product?.batch_number,
                exporter: data.holder?.name,
                issuer: data.issuer?.name,
                quality: {
                    grade: data.quality_metrics?.grade,
                    organic: data.quality_metrics?.organic
                },
                verifyUrl: data.verification_urls?.inji_verify 
            });
        } else {
            setError(data.message || "This certificate could not be verified in our records.");
        }
    } catch (err: any) {
        setError("Network error. Please ensure the QR contains a valid verification link.");
    } finally {
        setLoading(false);
    }
  };

  const startCamera = async () => {
    setScanResult(null);
    setError(null);
    setIsScanning(true);

    setTimeout(async () => {
        try {
            if (!document.getElementById("reader")) throw new Error("Camera element not found");
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                handleScanSuccess,
                () => {}
            );
        } catch (err: any) {
            setIsScanning(false);
            setError("Camera access denied. Please check your browser permissions.");
        }
    }, 100);
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
        try {
            await scannerRef.current.stop();
            await scannerRef.current.clear();
            scannerRef.current = null;
        } catch (err) {
            console.error(err);
        }
    }
    setIsScanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (isScanning) await stopCamera();
    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const html5QrCode = new Html5Qrcode("reader-hidden");
      const decodedText = await html5QrCode.scanFile(file, true);
      await handleScanSuccess(decodedText);
    } catch (err) {
      setError("No valid QR code found in this image.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfc] pb-12">
      {/* Header Section */}
      <div className="bg-emerald-800 pt-12 pb-20 px-4 rounded-b-[40px] shadow-lg shadow-emerald-100 mb-[-40px]">
        <div className="max-w-xl mx-auto text-center space-y-3">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-md mb-2">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Trust Verify</h1>
          <p className="text-emerald-50 text-sm md:text-base opacity-90 max-w-xs mx-auto">
            Securely verify Digital Product Passports and Batch Authenticity
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-6">
        
        {/* Large Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div id="reader-hidden" className="hidden"></div>
          
          <button 
            onClick={() => document.getElementById('qr-input')?.click()}
            disabled={isScanning || loading}
            className="group relative flex flex-col items-center justify-center p-8 bg-white border-2 border-emerald-50 rounded-3xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <div className="mb-4 p-4 bg-emerald-50 rounded-2xl group-hover:bg-emerald-100 transition-colors">
              <Upload className="w-8 h-8 text-emerald-600" />
            </div>
            <span className="font-bold text-emerald-950">Upload Image</span>
            <span className="text-xs text-emerald-600/60 mt-1">From gallery</span>
            <input id="qr-input" type="file" accept="image/*" className="hidden" onChange={handleFileUpload}/>
          </button>

          <button 
            onClick={isScanning ? stopCamera : startCamera}
            disabled={loading}
            className={`group relative flex flex-col items-center justify-center p-8 border-2 rounded-3xl transition-all active:scale-95 disabled:opacity-50 ${
              isScanning 
              ? 'bg-emerald-900 border-emerald-900 text-white' 
              : 'bg-white border-emerald-50 text-emerald-950 shadow-sm hover:shadow-md hover:border-emerald-200'
            }`}
          >
            <div className={`mb-4 p-4 rounded-2xl transition-colors ${
              isScanning ? 'bg-white/10 animate-pulse' : 'bg-emerald-50 group-hover:bg-emerald-100'
            }`}>
              {isScanning ? <Scan className="w-8 h-8 text-white" /> : <Camera className="w-8 h-8 text-emerald-600" />}
            </div>
            <span className="font-bold">{isScanning ? 'Cancel Scan' : 'Scan Camera'}</span>
            <span className={`text-xs mt-1 ${isScanning ? 'text-emerald-200' : 'text-emerald-600/60'}`}>
              {isScanning ? 'Live Viewfinder' : 'Real-time verify'}
            </span>
          </button>
        </div>

        {/* Scanner Viewport */}
        {isScanning && (
          <Card className="overflow-hidden border-none shadow-2xl rounded-[32px] animate-in zoom-in-95 duration-300">
            <div className="relative">
              <div id="reader" className="w-full bg-black aspect-square overflow-hidden" />
              <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-emerald-400 rounded-2xl relative">
                   <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1 rounded-tl-md"></div>
                   <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1 rounded-tr-md"></div>
                   <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1 rounded-bl-md"></div>
                   <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1 rounded-br-md"></div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white text-center">
               <p className="text-sm font-medium text-emerald-800">Align QR code within the frame</p>
            </div>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
            <div className="relative">
               <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
               <QrCode className="w-6 h-6 text-emerald-700 absolute inset-0 m-auto" />
            </div>
            <p className="mt-4 text-emerald-900 font-semibold">Validating Certificate...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="rounded-2xl border-red-100 bg-red-50 text-red-900 animate-in slide-in-from-top-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertTitle className="font-bold">Verification Error</AlertTitle>
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Result */}
        {scanResult && !loading && (
          <Card className="overflow-hidden border-none shadow-xl rounded-[32px] animate-in slide-in-from-bottom-6 duration-500">
            <div className={`p-6 ${scanResult.status === 'VALID' ? 'bg-emerald-600' : 'bg-red-600'}`}>
              <div className="flex justify-between items-center">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none py-1 px-3">
                  {scanResult.status}
                </Badge>
                <div className="bg-white rounded-full p-1">
                  {scanResult.status === 'VALID' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <X className="w-6 h-6 text-red-600" />
                  )}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mt-4">{scanResult.product}</h2>
              <p className="text-emerald-100 text-sm">Batch ID: {scanResult.batchNumber}</p>
            </div>
            
            <CardContent className="p-6 bg-white space-y-6">
              <div className="grid grid-cols-2 gap-y-6">
                <DataField label="Exporter" value={scanResult.exporter} />
                <DataField label="Issuer" value={scanResult.issuer} />
                <DataField label="Quality Grade" value={scanResult.quality?.grade} />
                <DataField label="Organic Status" value={scanResult.quality?.organic ? 'Certified Organic' : 'Conventional'} />
              </div>

              {scanResult.verifyUrl && (
                <Button 
                  className="w-full bg-emerald-950 hover:bg-black text-white rounded-2xl h-14 font-bold text-base shadow-lg transition-all"
                  onClick={() => window.open(scanResult.verifyUrl, '_blank')}
                >
                  View Cryptographic Proof
                  <ExternalLink className="ml-2 w-5 h-5" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DataField({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600/60 block">{label}</span>
      <span className="text-sm font-semibold text-emerald-950">{value || 'N/A'}</span>
    </div>
  );
}