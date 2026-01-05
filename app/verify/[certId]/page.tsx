import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { 
  CheckCircle, 
  AlertTriangle, 
  FileCheck, 
  ShieldCheck, 
  MapPin, 
  Droplets, 
  Leaf, 
  TestTube 
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default async function VerificationPage({ params }: { params: Promise<{ certId: string }> }) {
  const { certId } = await params;

  // 1. Fetch Data
  const certificate = await prisma.certificate.findUnique({
    where: { id: certId },
    include: {
      vc: true,
      batch: {
        include: {
          exporter: true,
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
  const inspection = certificate.batch?.inspections?.[0];
  const vc = certificate.vc;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header Verification Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className={`p-8 text-white text-center ${isExpired ? 'bg-red-600' : 'bg-emerald-600'}`}>
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-white/10">
              {isExpired ? <AlertTriangle size={40} /> : <CheckCircle size={40} />}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isExpired ? 'Certificate Expired' : 'Verified Authentic'}
            </h1>
            <p className="opacity-90 text-sm mt-2 font-medium">
              {isExpired ? 'This product passport is no longer valid.' : 'This digital passport is active and valid.'}
            </p>
          </div>

          <div className="p-8">
            <div className="flex flex-col items-center justify-center mb-10">
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                {vc?.verifyUrl ? (
                  <QRCodeSVG value={vc.verifyUrl} size={160} />
                ) : (
                  <div className="w-40 h-40 bg-slate-50 flex items-center justify-center rounded-lg text-xs text-slate-400">
                    No QR Data
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-5 text-center max-w-xs leading-relaxed uppercase tracking-widest font-semibold">
                Scan to verify cryptographic signature via Inji
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 px-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1.5">Product</p>
                <p className="font-bold text-slate-900 text-lg">{certificate.productType}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1.5">Batch ID</p>
                <p className="font-bold text-slate-900 text-lg">{certificate.batchNumber}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1.5">Issue Date</p>
                <p className="font-semibold text-slate-700">{new Date(certificate.issuedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1.5">Expiry Date</p>
                <p className={`font-semibold ${isExpired ? 'text-red-600' : 'text-slate-700'}`}>
                  {new Date(certificate.expiresAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Inspection Data Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5 mb-6">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <FileCheck className="w-5 h-5 text-emerald-600" />
            </div>
            Inspection Quality Report
          </h3>
          
          {inspection ? (
            <div className="grid grid-cols-2 gap-x-10 gap-y-8">
              <div className="col-span-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Quality Grade</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  GRADE {inspection.grade || 'A'}
                </div>
              </div>

              <div className="col-span-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Organic Status</p>
                <div className="flex items-center gap-2">
                  <Leaf className={`w-4 h-4 ${inspection.organic ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <p className="text-slate-800 font-bold text-sm">
                    {inspection.organic ? 'Certified Organic' : 'Conventional'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 flex items-center gap-1">
                  <Droplets className="w-3 h-3" /> Moisture Content
                </p>
                <p className="text-slate-900">
                  <span className="text-lg font-black">{inspection.moisture || 'N/A'}</span>
                  <span className="text-sm font-bold text-slate-400 ml-1">%</span>
                </p>
              </div>

              <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 flex items-center gap-1">
                  <TestTube className="w-3 h-3" /> Pesticide Residue
                </p>
                <p className="text-slate-900">
                  <span className="text-lg font-black">{inspection.pesticideResidue || '0'}</span>
                  <span className="text-sm text-slate-400 ml-1">ppm</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm font-medium italic">No detailed inspection data available.</p>
            </div>
          )}
        </div>

        {/* Origin & Logistics Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            Origin & Logistics
          </h3>
          <div className="space-y-4">
            {[
              { label: "Exporter", value: certificate.exporterName },
              { label: "Origin Location", value: certificate.batch?.location },
              { label: "Destination", value: certificate.batch?.destinationCountry },
              { label: "Total Quantity", value: `${certificate.batch?.quantity} ${certificate.batch?.unit}` }
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-slate-500 text-sm font-medium">{item.label}</span>
                <span className="font-bold text-slate-900">{item.value || 'Not specified'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Action */}
        <div className="text-center space-y-6 pt-4">
          {vc?.verifyUrl && (
            <a 
              href={vc.verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-3 bg-emerald-50 text-emerald-700 rounded-full font-bold text-sm hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-sm"
            >
              <ShieldCheck className="w-5 h-5" /> 
              Verify on Blockchain via Inji
            </a>
          )}
          
          <div className="bg-slate-200/50 h-px w-full max-w-xs mx-auto" />
          
          <p className="text-[10px] text-slate-400 leading-loose uppercase tracking-widest font-bold">
            Digitally Signed by {certificate.qaAgencyName} <br/> 
            <span className="font-mono lowercase text-slate-500 mt-1 block">DID: {vc?.issuerDid}</span>
          </p>
        </div>

      </div>
    </div>
  );
}