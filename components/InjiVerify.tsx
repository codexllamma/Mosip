"use client";

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle, XCircle, Loader2, ExternalLink, Upload, ScanLine, X, Camera } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function InjiVerify() {
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to keep track of the scanner instance
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Cleanup on unmount
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
    console.log("1. QR Code Scanned:", decodedText);

    // 1. Stop Camera immediately
    await stopCamera();

    // 2. Start Verification
    setLoading(true);
    setError(null);

    try {
        console.log("2. Fetching URL:", decodedText);
        const response = await fetch(decodedText);
        const data = await response.json();
        
        console.log("3. API Response:", data);

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
            setError(data.message || "Invalid Certificate");
        }
    } catch (err: any) {
        console.error("Fetch Error:", err);
        setError("Could not verify. Ensure the QR code contains a valid API URL.");
    } finally {
        setLoading(false);
    }
  };

  const startCamera = async () => {
    setScanResult(null);
    setError(null);
    setIsScanning(true);

    // Slight delay to allow the 'reader' div to mount
    setTimeout(async () => {
        try {
            // Check if element exists
            if (!document.getElementById("reader")) {
                throw new Error("Camera element not found");
            }

            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: "environment" }, // Prefer back camera
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                handleScanSuccess,
                (errorMessage) => {
                    // This fires on every frame that doesn't have a QR code.
                    // We ignore it to avoid spamming the console.
                }
            );
        } catch (err: any) {
            console.error("Failed to start camera:", err);
            setIsScanning(false);
            setError("Could not access camera. Please allow permissions or use Upload.");
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
            console.error("Failed to stop camera:", err);
        }
    }
    setIsScanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Reset states
    if (isScanning) await stopCamera();
    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const html5QrCode = new Html5Qrcode("reader-hidden");
      const decodedText = await html5QrCode.scanFile(file, true);
      await handleScanSuccess(decodedText);
    } catch (err) {
      console.error("File Scan Error:", err);
      setError("Could not read QR code. Ensure image is clear.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Importer Verification</h1>
        <p className="text-gray-500">Scan a batch QR code to verify the Digital Product Passport</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {/* Hidden div for file scanning */}
         <div id="reader-hidden" className="hidden"></div>

        <Button 
          variant="outline" 
          className="h-32 flex flex-col gap-3 border-2 border-dashed hover:border-emerald-500 hover:bg-emerald-50"
          onClick={() => document.getElementById('qr-input')?.click()}
          disabled={isScanning || loading}
        >
          <Upload className="w-8 h-8 text-gray-400" />
          <span>Upload QR Image</span>
          <input id="qr-input" type="file" accept="image/*" className="hidden" onChange={handleFileUpload}/>
        </Button>

        <Button 
          variant="outline" 
          className={`h-32 flex flex-col gap-3 border-2 border-dashed ${isScanning ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-500 hover:bg-blue-50'}`}
          onClick={isScanning ? stopCamera : startCamera}
          disabled={loading}
        >
          {isScanning ? (
              <>
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-blue-700 font-semibold">Scanning...</span>
              </>
          ) : (
              <>
                <ScanLine className="w-8 h-8 text-gray-400" />
                <span>Scan with Camera</span>
              </>
          )}
        </Button>
      </div>

      {/* Camera Viewport */}
      {isScanning && (
        <Card className="border-blue-200 shadow-md animate-in fade-in">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                    <Camera className="w-4 h-4"/> Point camera at QR Code
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div id="reader" className="w-full overflow-hidden rounded-lg bg-black min-h-[300px]"></div>
                <Button variant="destructive" size="sm" className="w-full mt-4" onClick={stopCamera}>
                    <X className="w-4 h-4 mr-2"/> Stop Camera
                </Button>
            </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-8 text-emerald-600 animate-in fade-in">
          <Loader2 className="w-10 h-10 animate-spin mb-2" />
          <p className="text-sm font-medium">Fetching Certificate Data...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-2">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Verification Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Result Card */}
      {scanResult && !loading && (
        <Card className={`border-l-4 ${scanResult.status === 'VALID' ? 'border-l-emerald-500' : 'border-l-red-500'} shadow-lg animate-in fade-in slide-in-from-bottom-4`}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                    {scanResult.status === 'VALID' ? <CheckCircle className="text-emerald-500" /> : <XCircle className="text-red-500" />}
                    {scanResult.product}
                </CardTitle>
                <CardDescription>Batch #{scanResult.batchNumber}</CardDescription>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${scanResult.status === 'VALID' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {scanResult.status}
              </span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-gray-500 block text-xs uppercase font-semibold">Exporter</span>
                    <span className="font-medium">{scanResult.exporter}</span>
                </div>
                <div>
                    <span className="text-gray-500 block text-xs uppercase font-semibold">Issuer</span>
                    <span className="font-medium">{scanResult.issuer}</span>
                </div>
                <div>
                    <span className="text-gray-500 block text-xs uppercase font-semibold">Grade</span>
                    <span className="font-medium">{scanResult.quality?.grade || 'N/A'}</span>
                </div>
                <div>
                    <span className="text-gray-500 block text-xs uppercase font-semibold">Organic</span>
                    <span className="font-medium">{scanResult.quality?.organic ? 'Yes' : 'No'}</span>
                </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
                {scanResult.verifyUrl && (
                    <Button 
                        className="bg-gray-900 hover:bg-black text-white gap-2"
                        onClick={() => window.open(scanResult.verifyUrl, '_blank')}
                    >
                        View Cryptographic Proof
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}