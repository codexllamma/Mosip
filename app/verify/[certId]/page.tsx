import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CheckCircle, AlertTriangle, Package, Calendar, User, FileCheck, ShieldCheck, MapPin } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

export default async function VerificationPage({ params }: { params: Promise<{ certId: string }> }) {
  const { certId } = await params;

  // 1. Fetch Data directly
  const certificate = await prisma.certificate.findUnique({
    where: { id: certId },
    include: {
      vc: true,
      batch: {
        include: {
          exporter: true,
          // FIX: Changed 'inspection' to 'inspections' (plural)
          inspections: {
            include: {
              inspector: true
            }
          }
        }
      }
    }
  });

  if (!certificate) {
    return notFound();
  }

  // 2. Process Data
  const isExpired = new Date(certificate.expiresAt) < new Date();
  
  // FIX: Access the first inspection from the array
  const inspection = certificate.batch?.inspections?.[0];
  
  const vc = certificate.vc;

  // ... (Rest of your UI code remains exactly the same)
  // I am recreating your UI logic below to ensure copy-paste works

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className={`p-6 text-white text-center ${isExpired ? 'bg-red-600' : 'bg-emerald-600'}`}>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
              {isExpired ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
            </div>
            <h1 className="text-2xl font-bold">{isExpired ? 'Certificate Expired' : 'Verified Authentic'}</h1>
            <p className="opacity-90 text-sm mt-1">
              {isExpired ? 'This product passport is no longer valid.' : 'This digital passport is active and valid.'}
            </p>
          </div>

          <div className="p-8">
             <div className="flex flex-col items-center justify-center mb-8">
                {vc?.verifyUrl ? (
                  <QRCodeSVG value={vc.verifyUrl} size={180} />
                ) : (
                  <div className="w-40 h-40 bg-gray-100 flex items-center justify-center rounded-lg text-xs text-gray-400">
                    No QR Data
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-4 text-center max-w-xs">
                  Scan to verify cryptographic signature on the blockchain via Inji Verify.
                </p>
             </div>

             <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                   <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Product</p>
                   <p className="font-semibold text-gray-900">{certificate.productType}</p>
                </div>
                <div>
                   <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Batch Number</p>
                   <p className="font-semibold text-gray-900">{certificate.batchNumber}</p>
                </div>
                <div>
                   <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Issued Date</p>
                   <p className="font-medium">{new Date(certificate.issuedAt).toLocaleDateString()}</p>
                </div>
                <div>
                   <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Expiry Date</p>
                   <p className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                     {new Date(certificate.expiresAt).toLocaleDateString()}
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
           <h3 className="font-bold text-gray-900 flex items-center gap-2 pb-4 border-b border-gray-100">
             <FileCheck className="w-5 h-5 text-emerald-600" /> Inspection Data
           </h3>
           
           {inspection ? (
             <div className="grid grid-cols-2 gap-y-6 gap-x-4">
               <div>
                  <p className="text-xs text-gray-500">Quality Grade</p>
                  <span className="inline-block mt-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-bold">
                    Grade {inspection.grade || 'A'}
                  </span>
               </div>
               <div>
                  <p className="text-xs text-gray-500">Organic Status</p>
                  <p className="font-medium mt-1">{inspection.organic ? 'Certified Organic' : 'Conventional'}</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500">Moisture Content</p>
                  <p className="font-medium mt-1">{inspection.moisture || 'N/A'}%</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500">Pesticide Residue</p>
                  <p className="font-medium mt-1">{inspection.pesticideResidue || 'None'} ppm</p>
               </div>
             </div>
           ) : (
             <p className="text-gray-500 italic text-sm">No detailed inspection data available.</p>
           )}
        </div>

        {/* Origin Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
           <h3 className="font-bold text-gray-900 flex items-center gap-2 pb-4 border-b border-gray-100">
             <MapPin className="w-5 h-5 text-blue-600" /> Origin & Logistics
           </h3>
           <div className="space-y-4">
              <div className="flex justify-between">
                 <span className="text-gray-600 text-sm">Exporter</span>
                 <span className="font-medium text-gray-900">{certificate.exporterName}</span>
              </div>
              <div className="flex justify-between">
                 <span className="text-gray-600 text-sm">Origin Location</span>
                 <span className="font-medium text-gray-900">{certificate.batch?.location}</span>
              </div>
              <div className="flex justify-between">
                 <span className="text-gray-600 text-sm">Destination</span>
                 <span className="font-medium text-gray-900">{certificate.batch?.destinationCountry}</span>
              </div>
              <div className="flex justify-between">
                 <span className="text-gray-600 text-sm">Quantity</span>
                 <span className="font-medium text-gray-900">{certificate.batch?.quantity} {certificate.batch?.unit}</span>
              </div>
           </div>
        </div>

        {/* Footer Action */}
        <div className="text-center pt-4">
           {vc?.verifyUrl && (
             <a 
               href={vc.verifyUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2 text-emerald-700 font-bold hover:underline"
             >
               <ShieldCheck className="w-5 h-5" /> Verify on Inji (External)
             </a>
           )}
           <p className="text-xs text-gray-400 mt-4">
             Signed by {certificate.qaAgencyName} <br/> 
             DID: <span className="font-mono">{vc?.issuerDid}</span>
           </p>
        </div>

      </div>
    </div>
  );
}