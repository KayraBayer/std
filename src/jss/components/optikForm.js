// src/pages/OptikForm.jsx
import React from "react";

/* URL’de ?count=40 gibi bir query bekler */
const OptikForm = () => {
  const params   = new URLSearchParams(window.location.search);
  const count    = Math.max(1, parseInt(params.get("count") || "20", 10)); // güvenlik
  const rows     = Array.from({ length: count }, (_, i) => i + 1);
  const OPTIONS  = ["A", "B", "C", "D"];                                   // Şıklar

  return (
    <div className="min-h-screen bg-neutral-950 p-6 text-gray-200 print:bg-white print:p-0 print:text-black">
      <h1 className="mb-6 text-center text-2xl font-bold tracking-wide print:hidden">
        Optik Cevap Formu
      </h1>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-center text-sm">
          <thead className="sticky top-0 bg-neutral-900 print:table-header-group">
            <tr>
              <th className="border border-neutral-800 px-2 py-1">Soru</th>
              {OPTIONS.map((h) => (
                <th key={h} className="border border-neutral-800 px-3 py-1">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((n) => (
              <tr key={n} className="odd:bg-neutral-900/40 even:bg-neutral-800/40 print:bg-white">
                {/* Soru numarası */}
                <td className="border border-neutral-800 px-2 py-1 print:border-black">
                  {n}
                </td>

                {OPTIONS.map((opt) => {
                  const id = `q${n}-${opt}`;
                  return (
                    <td
                      key={opt}
                      className="border border-neutral-800 px-4 py-1 print:border-black"
                    >
                      {/* input’u gizle, label daireyi gösterir */}
                      <input
                        id={id}
                        type="radio"
                        name={`q${n}`}
                        value={opt}
                        className="peer hidden"
                      />
                      <label
                        htmlFor={id}
                        className="inline-block h-4 w-4 rounded-full border-2 border-gray-400 peer-checked:bg-blue-600 peer-checked:ring-2 peer-checked:ring-blue-400 print:border-black print:peer-checked:bg-black print:peer-checked:ring-0"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Yazdırma butonu (ekranda gözükür, çıktı da görünmez) */}
      <div className="mt-6 flex justify-center print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 active:scale-95"
        >
          Yazdır
        </button>
      </div>
    </div>
  );
};

export default OptikForm;
