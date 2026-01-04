// app/verify/[certId]/page.tsx
import { notFound } from "next/navigation";
import { CheckCircle, AlertCircle, ShieldCheck, Box, User, Calendar, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db"; // Direct DB access is faster for Server Components

// This is a Server Component
export default async function VerificationPage({ 
  params 
}: { 
  params: Promise<{ certId: string }> 
}) {
  const { certId } = await params;

  // 1. Fetch Data directly (reusing logic from your route.ts is better/faster here)
  const certificate = await prisma.certificate.findUnique({
    where: { id: certId },
    include: {
      vc: true,
      batch: {
        include: {
          exporter: true,
          inspection: { include: { inspector: true } }
        }
      }
    }
  });

  if (!certificate) {
    return notFound();
  }

  // 2. Process Data
  const isExpired = new Date(certificate.expiresAt) < new Date();
  const inspection = certificate.batch?.inspection;
  const vc = certificate.vc;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className={`p-8 text-center ${isExpired ? 'bg-red-50' : 'bg-emerald-50'}`}>
            {isExpired ? (
              <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
            ) : (
              <ShieldCheck className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
            )}
            
            <h1 className={`text-3xl font-bold ${isExpired ? 'text-red-900' : 'text-emerald-900'}`}>
              {isExpired ? 'Certificate Expired' : 'Valid Certificate'}
            </h1>
            <p className={`mt-2 ${isExpired ? 'text-red-700' : 'text-emerald-700'}`}>
              Certificate ID: <span className="font-mono font-bold">{certId.substring(0,8)}...</span>
            </p>
          </div>

          {/* Core Details */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Box className="w-4 h-4" /> Product Details
              </h3>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Product</span>
                  <span className="font-bold text-gray-900">{certificate.productType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Batch #</span>
                  <span className="font-mono text-gray-900">{certificate.batchNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Origin</span>
                  <span className="text-gray-900">{certificate.batch?.location}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" /> Participants
              </h3>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Exporter</span>
                  <span className="font-bold text-gray-900">{certificate.exporterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">QA Agency</span>
                  <span className="text-gray-900">{certificate.qaAgencyName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Metrics */}
        {inspection && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
             <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Quality Inspection Data
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 uppercase font-bold">Grade</p>
                    <p className="text-2xl font-bold text-blue-900">{inspection.grade}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold">Moisture</p>
                    <p className="text-xl font-bold text-gray-900">{inspection.moisture}%</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold">Organic</p>
                    <p className={`text-xl font-bold ${inspection.organic ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {inspection.organic ? 'Yes' : 'No'}
                    </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold">Pesticide</p>
                    <p className="text-xl font-bold text-gray-900">{inspection.pesticideResidue} ppm</p>
                </div>
             </div>
          </div>
        )}

        {/* Blockchain Action */}
        

        <div className="text-center text-sm text-gray-400">
          Generated by AgriQCert Digital Passport System
        </div>
      </div>
    </div>
  );
}