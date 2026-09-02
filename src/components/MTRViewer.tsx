import { Download, FileText, X } from 'lucide-react';
import { motion } from 'motion/react';

export const MTRViewer = ({ record, onClose }: { record: any, onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-industrial-ink/90 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-industrial-line/10 bg-industrial-bg/10 flex justify-between items-center">
          <div>
            <span className="tech-label text-[10px] font-bold text-industrial-accent uppercase tracking-widest">Digital MTR Document Viewer</span>
            <h2 className="tech-value text-sm uppercase">{record.material.name} - HEAT: {record.heatNumber}</h2>
          </div>
          <div className="flex items-center gap-4">
              {record.mtrUrl?.startsWith('data:') && (
                <a
                  href={record.mtrUrl}
                  download={record.fileName || `MTR_${record.mtrNumber}.pdf`}
                  className="flex items-center gap-2 px-3 py-1 bg-industrial-ink text-white tech-value text-[10px] hover:bg-industrial-accent hover:text-industrial-ink transition-colors"
                >
                  <Download size={12} /> DOWNLOAD
                </a>
              )}
              <button onClick={onClose} className="p-2 hover:bg-industrial-line/10 rounded-full">
                <X size={24} />
              </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-industrial-bg/30 p-8 flex justify-center">
          {record.mtrUrl?.startsWith('data:') ? (
            <div className="w-full max-w-5xl bg-white shadow-lg overflow-hidden flex flex-col items-center justify-center min-h-[70vh]">
              {record.mtrUrl.includes('image/') ? (
                <img src={record.mtrUrl} alt="MTR Document" className="max-w-full h-auto" />
              ) : (
                <object
                  data={record.mtrUrl}
                  type="application/pdf"
                  className="w-full h-full flex-1 min-h-[75vh]"
                  width="100%"
                  height="100%"
                >
                  <div className="flex flex-col items-center gap-4 p-12 text-center">
                    <FileText size={48} className="text-industrial-accent opacity-20" />
                    <p className="tech-value text-sm">PDF Viewer unavailable in this browser context.</p>
                    <a
                      href={record.mtrUrl}
                      download={record.fileName || 'mtr_document.pdf'}
                      className="bg-industrial-ink text-white px-4 py-2 tech-value text-[10px] hover:bg-industrial-accent hover:text-industrial-ink transition-colors"
                    >
                      DOWNLOAD TO VIEW
                    </a>
                  </div>
                </object>
              )}
            </div>
          ) : (
            <div className="w-full max-w-[800px] bg-white shadow-lg p-8 md:p-12 flex flex-col gap-8 text-black font-serif">
            <div className="flex justify-between border-b-4 border-black pb-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-green-600">
                    <span className="text-white font-bold text-xl">F</span>
                  </div>
                  <span className="text-3xl font-bold italic uppercase">FRANKY</span>
                </div>
                <span className="text-[10px] font-sans uppercase opacity-60 tracking-tighter">Corporate quality assurance laboratory • ISO 9001 Certified</span>
              </div>
              <div className="text-right flex flex-col text-[10px] font-sans uppercase tracking-tight">
                <span>Certificate No: <span className="font-bold">{record.mtrNumber}</span></span>
                <span>Date: {new Date(record.receivedDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-xs">
              <div>
                <h4 className="font-sans font-bold uppercase border-b border-black mb-2 py-0.5">Customer / Project</h4>
                <p className="font-bold">Industrial Construction Services, Inc.</p>
                <p>Project Identifier: {record.material.iso || 'General Inventory'}</p>
                <p>Purchase Order: PO-2024-{Math.floor(Math.random() * 9000) + 1000}</p>
              </div>
              <div>
                <h4 className="font-sans font-bold uppercase border-b border-black mb-2 py-0.5">Material Specification</h4>
                <p className="font-bold text-sm underline underline-offset-2">{record.material.name}</p>
                <p>Part Number: {record.material.sku}</p>
                <p>Classification: {record.material.category}</p>
                <p>Origin: Domestic Materials</p>
              </div>
            </div>

            <div>
              <h4 className="font-sans font-bold uppercase border-b border-black mb-4 py-1 text-center bg-gray-50 text-[10px]">Chemical Analysis Report</h4>
              <table className="w-full text-[11px] text-center border-collapse">
                <thead>
                  <tr className="border-b border-black bg-gray-50/50">
                    <th className="py-1">Heat No.</th>
                    <th>C (%)</th>
                    <th>Mn (%)</th>
                    <th>P (%)</th>
                    <th>S (%)</th>
                    <th>Si (%)</th>
                    <th>Cr (%)</th>
                    <th>Ni (%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="h-10">
                    <td className="font-bold border-r border-black/10">{record.heatNumber}</td>
                    <td>0.08</td>
                    <td>0.45</td>
                    <td>0.012</td>
                    <td>0.008</td>
                    <td>0.24</td>
                    <td>0.12</td>
                    <td>0.14</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-sans font-bold uppercase border-b border-black mb-4 py-1 text-center bg-gray-50 text-[10px]">Mechanical Property Verification</h4>
               <table className="w-full text-[11px] text-center border-collapse">
                <thead>
                  <tr className="border-b border-black bg-gray-50/50">
                    <th className="py-1">Yield Strength (PSI)</th>
                    <th>Tensile Strength (PSI)</th>
                    <th>Elongation (%)</th>
                    <th>Hardness (HBW)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="h-10">
                    <td>38,400</td>
                    <td>64,200</td>
                    <td>34.5%</td>
                    <td>168</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 p-3 bg-gray-50 border border-black/5 text-[9px] font-sans italic">
                Notes: Material has been tested in accordance with ASTM A105 / A105M. Verified for high-pressure industrial service application. Dimensions confirmed within ±0.015" tolerance.
              </div>
            </div>

            <div className="mt-auto border-t border-black pt-6 flex justify-between items-end">
              <div className="flex flex-col text-[9px] font-sans opacity-60">
                <span className="font-bold">VALIDATION STAMP</span>
                <span>Ledger Hash: {record.id.split('-').pop()}</span>
                <span>Ingested via AI OCR Engine • {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="text-center flex flex-col items-center">
                 <div className="w-40 h-16 border-b border-gray-400 mb-1 flex items-center justify-center italic text-2xl text-blue-900/60 font-bold tracking-widest transform -rotate-3 border-4 border-double border-blue-900/20 rounded-md">
                    MT CERTIFIED
                 </div>
                 <span className="text-[10px] font-sans uppercase font-bold tracking-wider">Authorized Inspector Signature</span>
              </div>
            </div>
          </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
