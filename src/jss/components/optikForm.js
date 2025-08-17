// src/pages/OptikForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../context/authContext";
import { useLocation } from "react-router-dom";

/* ——— Yardımcılar ——— */
const toCollectionName = (str) =>
  (str || "unknown")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

const Chip = ({ children, color = "indigo" }) => {
  const map = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${map[color]}`}>
      {children}
    </span>
  );
};

export default function OptikForm() {
  const { user } = useAuth();
  const { state } = useLocation(); // ← Dashboard’tan gelecek

  // —— URL & state paramları —— //
  const params     = new URLSearchParams(window.location.search);
  const count      = Math.max(1, parseInt(params.get("count") || "20", 10));
  const testName   = params.get("test")  || state?.testName || "Adsız Test";
  const testId     = params.get("id")    || state?.testId   || null;
  const testCat    = params.get("cat")   || state?.testCat  || null;
  const testGrade  = params.get("grade") ? parseInt(params.get("grade"),10) : (state?.testGrade ?? null);
  const testLink   = params.get("link")  || state?.testLink || null;

  // Öğrenci adı önce state / URL’den gelsin, yoksa DB’den çek
  const initialStudent =
    (state?.studentName || params.get("student") || "").trim();
  const [studentName, setStudentName] = useState(initialStudent);

  const OPTIONS = ["A", "B", "C", "D"];
  const rows = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);

  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const answered = useMemo(() => Object.keys(answers).length, [answers]);

  // Öğrenci adı state/URL ile gelmediyse, DB’den çek (fallback)
  useEffect(() => {
    let cancelled = false;
    if (studentName) return; // isim zaten var, sorguya gerek yok
    const fetchStudentName = async () => {
      try {
        if (!user?.email) return;
        const qref = query(collection(db, "students"), where("email", "==", user.email), limit(1));
        const snap = await getDocs(qref);
        if (cancelled) return;

        if (!snap.empty) {
          const data  = snap.docs[0].data();
          const first = data.firstname || data.firstName || "";
          const last  = data.lastname  || data.lastName  || "";
          const full  = `${first} ${last}`.trim();
          setStudentName(full || (user.email?.split("@")[0] ?? "Bilinmeyen"));
        } else {
          setStudentName(user.email?.split("@")[0] ?? "Bilinmeyen");
        }
      } catch {
        if (!cancelled) setStudentName(user?.email?.split("@")[0] ?? "Bilinmeyen");
      }
    };
    fetchStudentName();
    return () => { cancelled = true; };
  }, [user, studentName, db]);

  const handlePick  = (qNo, opt) => setAnswers((p) => ({ ...p, [qNo]: opt }));
  const handleClear = () => { setAnswers({}); setMsg(null); };

  const handleSubmit = async () => {
    setMsg(null);
    if (!user) {
      setMsg({ type: "err", text: "Giriş yapmadan cevap gönderemezsiniz." });
      return;
    }

    // cevapları tek string + dizi
    let answersString = "";
    const answersArray = Array.from({ length: count }, (_, i) => {
      const v = answers[i + 1] || "-";
      answersString += v;
      return v;
    });

    setSaving(true);
    try {
      // Dashboard’tan nameKey geldiyse onu kullan; yoksa isimden türet
      const collectionName = (state?.nameKey && typeof state.nameKey === "string" && state.nameKey)
        ? state.nameKey.toLocaleLowerCase("tr-TR")
        : toCollectionName(studentName).toLocaleLowerCase("tr-TR");

      const payload = {
        type: "submission",
        test: { id: testId, name: testName, category: testCat, grade: testGrade, link: testLink },
        user: { uid: user.uid || null, email: user.email || null, name: studentName || null },
        count,
        answeredCount: answered,
        answers: answersString,
        answersArray,
        answersMap: answers,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, collectionName), payload);
      setMsg({ type: "ok", text: `Cevaplar kaydedildi.` });
    } catch (e) {
      console.error(e);
      setMsg({ type: "err", text: "Kaydetme sırasında bir hata oluştu." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="min-h-screen bg-slate-50 px-5 py-8 text-slate-800 md:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Başlık + etiketler */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Optik Cevap Formu</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Chip color="slate">Öğrenci: <span className="font-semibold">{studentName || "—"}</span></Chip>
            <Chip color="indigo">Test: <span className="font-semibold">{testName}</span></Chip>
            <Chip color="emerald">İşaretlenen: <span className="font-semibold">{answered}</span> / {count}</Chip>
          </div>
        </div>

        {/* Bildirim */}
        {msg && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm ring-1 ${
            msg.type === "ok" ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                              : "bg-rose-50 text-rose-700 ring-rose-100"}`}>
            {msg.text}
          </div>
        )}

        {/* Kart */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full border-separate border-spacing-0 text-center text-sm">
              <thead className="sticky top-0 z-10 bg-indigo-50 text-indigo-800">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-3 text-left text-[13px] font-semibold">Soru</th>
                  {OPTIONS.map((h) => (
                    <th key={h} className="border-b border-slate-200 px-3 py-3 text-[13px] font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {rows.map((n) => (
                  <tr key={n} className="odd:bg-slate-50 even:bg-white transition-colors hover:bg-indigo-50/40">
                    <td className="border-b border-slate-200 px-3 py-2.5 text-left font-medium">{n}</td>
                    {OPTIONS.map((opt) => {
                      const id = `q${n}-${opt}`;
                      const checked = answers[n] === opt;
                      return (
                        <td key={opt} className="border-b border-slate-200 px-3 py-2.5">
                          <input id={id} type="radio" name={`q${n}`} value={opt}
                                 className="sr-only peer" checked={checked || false}
                                 onChange={() => handlePick(n, opt)} />
                          <label htmlFor={id}
                                 className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-slate-300 transition
                                            hover:ring-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                                            peer-checked:bg-indigo-600 peer-checked:ring-indigo-300"
                                 title={opt}>
                            <span className="block h-2.5 w-2.5 rounded-full bg-white opacity-0 transition-opacity peer-checked:opacity-100" />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Alt bar */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row">
            <div className="h-2 w-full rounded-full bg-slate-100 sm:max-w-xs">
              <div className="h-2 rounded-full bg-indigo-300" style={{ width: `${(answered / count) * 100}%` }} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleClear}
                      className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300
                                 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                Temizle
              </button>
              <button onClick={handleSubmit} disabled={saving}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors
                                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                                  ${saving ? "cursor-not-allowed bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-500"}`}>
                {saving ? "Kaydediliyor..." : "Cevapları Kaydet"}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          İpucu: Hücrelere tıklayarak işaretleyebilir, <span className="font-medium">Temizle</span> ile sıfırlayabilirsiniz.
        </p>
      </div>
    </section>
  );
}
