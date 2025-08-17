// src/jss/UserDashboard.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { motion } from "framer-motion";
import {
  ChevronDown,
  BookOpen,
  ClipboardList,
  User2,
  BarChart3,
  FileText,
  ExternalLink,
  SquareLibrary,
} from "lucide-react";
import { db } from "../firebaseConfig";
import { useAuth } from "./context/authContext";
import { useNavigate } from "react-router-dom";

/* ——— Yardımcılar ——— */
const titleCaseTR = (s = "") =>
  String(s)
    .trim()
    .split(/\s+/)
    .map((w) =>
      w
        .split("-")
        .map((p) =>
          p
            ? p[0].toLocaleUpperCase("tr-TR") +
              p.slice(1).toLocaleLowerCase("tr-TR")
            : ""
        )
        .join("-")
    )
    .join(" ");

const clean = (s) => {
  if (!s) return "";
  const t = String(s).trim();
  return t === "undefined" || t === "null" ? "" : t;
};

/* ——— Pastel yardımcıları ——— */
const pastelBg = {
  indigo: "bg-indigo-50 ring-indigo-100 text-indigo-600",
  emerald: "bg-emerald-50 ring-emerald-100 text-emerald-600",
  violet: "bg-violet-50 ring-violet-100 text-violet-600",
  rose: "bg-rose-50 ring-rose-100 text-rose-600",
  amber: "bg-amber-50 ring-amber-100 text-amber-600",
};
const pastelText = {
  indigo: "text-indigo-700",
  emerald: "text-emerald-700",
  violet: "text-violet-700",
  rose: "text-rose-600",
  amber: "text-amber-700",
};

/* ——— Rozet ——— */
const IconBadge = ({ color = "indigo", children, className = "" }) => (
  <span
    className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 ${pastelBg[color]} ${className}`}
  >
    {children}
  </span>
);

/* ——— Bölüm başlığı ——— */
const SectionHeader = ({ icon: Icon, color = "indigo", children }) => (
  <div className="mb-5 flex items-center gap-2">
    <IconBadge color={color}>
      <Icon className="h-4 w-4" />
    </IconBadge>
    <h2 className={`text-lg font-semibold ${pastelText[color]}`}>{children}</h2>
  </div>
);

/* ——— Kart ——— */
const Card = ({ className = "", children }) => (
  <div className={`rounded-xl border border-slate-300 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

/* ——— Katlanabilir blok (stabil animasyon) ——— */
const Collapsible = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  const [maxH, setMaxH] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => setMaxH(el.scrollHeight);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const t = setTimeout(measure, 50);

    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [children, open]);

  return (
    <div className="mb-5 rounded-xl border border-slate-300 bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border-b border-slate-200 px-5 py-3.5 text-left text-[15px] font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        {title}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-slate-500"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <motion.div
        initial={false}
        animate={open ? { maxHeight: maxH, opacity: 1 } : { maxHeight: 0, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
        style={{ willChange: "max-height, opacity" }}
      >
        <div ref={contentRef} className="px-6 pb-5 pt-4">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

/* ——— Slayt listesi ——— */
const SlideList = ({ cats = [] }) =>
  cats.length ? (
    <div className="space-y-5">
      {cats.map(({ cat, list }) => (
        <div key={cat} className="space-y-2">
          <div className="flex items-center gap-2">
            <IconBadge color="indigo">
              <BookOpen className="h-4 w-4" />
            </IconBadge>
            <p className="text-sm font-medium text-indigo-700">{cat}</p>
          </div>
          <ul className="space-y-1.5 text-sm leading-6 text-slate-700">
            {list.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <IconBadge color="indigo" className="h-6 w-6">
                  <FileText className="h-3.5 w-3.5" />
                </IconBadge>
                {s.link ? (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-700"
                  >
                    {s.name}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  s.name
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs text-slate-500">Bu sınıf için slayt yok.</p>
  );

/* ——— Test listesi (iki butonlu) ——— */
const TestList = ({ cats = [], studentName = "", solvedSet = new Set() }) => {
  const navigate = useNavigate();
  return cats.length ? (
    <div className="space-y-5">
      {cats.map(({ cat, list }) => (
        <div key={cat} className="space-y-2">
          <div className="flex items-center gap-2">
            <IconBadge color="emerald">
              <SquareLibrary className="h-4 w-4" />
            </IconBadge>
            <p className="text-sm font-medium text-emerald-700">{cat}</p>
          </div>

          <ul className="space-y-2.5 text-sm leading-6 text-slate-700">
            {list.map((t, i) => {
              const qCount = t.questionCount ?? 20;
              const hasLink = Boolean(t.link);
              const isSolved = solvedSet?.has?.(t.name);

              return (
                <li
                  key={i}
                  className="flex flex-col gap-2 rounded-lg md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <IconBadge color="emerald" className="h-6 w-6 shrink-0">
                      <ClipboardList className="h-3.5 w-3.5" />
                    </IconBadge>
                    <span className="truncate">{t.name}</span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                      {qCount} soru
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* Testi Gör */}
                    {hasLink ? (
                      <a
                        href={t.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        Testi Gör
                        <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <button
                        disabled
                        className="inline-flex cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500"
                        title="Bu test için bağlantı eklenmemiş."
                      >
                        Testi Gör
                      </button>
                    )}

                    {/* Testi Çöz */}
                    <button
                      aria-disabled={!!isSolved}
                      disabled={!!isSolved}
                      onClick={() => {
                        if (isSolved) return;
                        navigate(
                          `/optik?count=${qCount}&test=${encodeURIComponent(
                            t.name
                          )}&student=${encodeURIComponent(studentName)}`
                        );
                      }}
                      title={isSolved ? "Bu test daha önce çözüldü." : "Testi çöz"}
                      className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm transition-colors focus:outline-none focus-visible:ring-2
                        ${
                          isSolved
                            ? "cursor-not-allowed bg-slate-200 text-slate-500 ring-1 ring-slate-300"
                            : "bg-emerald-600 text-white ring-1 ring-emerald-700/20 hover:bg-emerald-500 focus-visible:ring-emerald-400"
                        }`}
                    >
                      {isSolved ? "Çözüldü" : "Testi Çöz"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs text-slate-500">Bu sınıf için test yok.</p>
  );
};

export default function UserDashboard() {
  const { user } = useAuth();

  // GRADES sabit referans
  const GRADES = useMemo(() => [5, 6, 7, 8], []);

  const [slides, setSlides] = useState({});
  const [tests, setTests] = useState({});
  const [profile, setProfile] = useState(null);
  const [solvedSet, setSolvedSet] = useState(new Set());

  /* ——— Profil ——— */
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const uidDoc = await getDoc(doc(db, "students", user.uid));
        setProfile(uidDoc.exists() ? { id: uidDoc.id, ...uidDoc.data() } : {});
      } catch (e) {
        console.error("Profil çekilemedi:", e);
        setProfile({});
      }
    })();
  }, [user]);

  /* ——— Slayt & test verileri ——— */
  useEffect(() => {
    const getData = async () => {
      try {
        const [slideCatsSnap, testCatsSnap] = await Promise.all([
          getDocs(collection(db, "slaytKategoriAdlari")),
          getDocs(collection(db, "kategoriAdlari")),
        ]);

        const slideCats = slideCatsSnap.docs.map((d) => d.data().name);
        const testCats = testCatsSnap.docs.map((d) => d.data().name);

        const slidesObj = {};
        const testsObj = {};

        await Promise.all(
          GRADES.map(async (g) => {
            // Slaytlar
            const slideArr = [];
            await Promise.all(
              slideCats.map(async (cat) => {
                const snap = await getDocs(
                  query(collection(db, cat), where("grade", "==", g))
                );
                const list = snap.docs.map((s) => ({
                  name: s.data().name,
                  link: s.data().link || "",
                }));
                if (list.length) slideArr.push({ cat, list });
              })
            );
            slidesObj[g] = slideArr;

            // Testler
            const testArr = [];
            await Promise.all(
              testCats.map(async (cat) => {
                const snap = await getDocs(
                  query(collection(db, cat), where("grade", "==", g))
                );
                const list = snap.docs.map((t) => {
                  const d = t.data();
                  const start = d.createdAt?.toDate?.();
                  const closing = start
                    ? new Date(start.getTime() + (d.duration || 0) * 60_000)
                    : null;
                  return {
                    name: d.name,
                    link: d.link || "",
                    closing,
                    questionCount: d.questionCount ?? d.count ?? 20,
                  };
                });
                if (list.length) testArr.push({ cat, list });
              })
            );
            testsObj[g] = testArr;
          })
        );

        setSlides(slidesObj);
        setTests(testsObj);
      } catch (err) {
        console.error("Firestore veri çekme hatası:", err);
      }
    };

    getData();
  }, [GRADES]);

  /* ——— Ad / Soyad ——— */
  const { firstName, lastName } = useMemo(() => {
    const f = clean(profile?.firstName);
    const l = clean(profile?.lastName);
    return {
      firstName: f ? titleCaseTR(f) : "-",
      lastName: l ? titleCaseTR(l) : "-",
    };
  }, [profile]);

  // Öğrenci tam adı (fallback: e-posta öneki)
  const studentFullName = useMemo(() => {
    const fn = firstName && firstName !== "-" ? firstName : "";
    const ln = lastName && lastName !== "-" ? lastName : "";
    const full = `${fn}_${ln}`.trim().toLowerCase();
    return full || (user?.email?.split("@")[0] ?? "Bilinmeyen");
  }, [firstName, lastName, user]);

  /* ——— Daha önce çözülen testleri çek ——— */
  useEffect(() => {
    if (!studentFullName) return;
    (async () => {
      try {
        const qref = query(
          collection(db, studentFullName),
          where("type", "==", "submission")
        );
        const snap = await getDocs(qref);
        const s = new Set();
        snap.forEach((d) => {
          const tn = d.data()?.test?.name;
          if (tn) s.add(String(tn));
        });
        setSolvedSet(s);
      } catch (e) {
        console.error("Çözülen testler alınamadı:", e);
        setSolvedSet(new Set());
      }
    })();
  }, [studentFullName]);

  /* ——— UI ——— */
  return (
    <section className="min-h-screen bg-slate-50 px-5 py-10 text-slate-800 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center justify-center gap-2">
          <IconBadge color="indigo">
            <BookOpen className="h-4 w-4" />
          </IconBadge>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Öğrenci Paneli
          </h1>
        </div>

        {/* 3 kolonlu ızgara: Slayt/Test kartı 2 kolon kaplar, sağda dikey yığın */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* SOL (2 kolon): Slayt & Testler */}
          <Card className="p-7 md:p-8 lg:col-span-2">
            <SectionHeader icon={BookOpen} color="indigo">
              Slaytlar &amp; Testler
            </SectionHeader>
            {GRADES.map((g) => (
              <Collapsible key={g} title={`${g}. Sınıf`}>
                <h3 className={`mb-2 text-sm font-semibold ${pastelText.indigo}`}>
                  Slaytlar
                </h3>
                <SlideList cats={slides[g] || []} />
                <h3 className={`mb-2 mt-5 text-sm font-semibold ${pastelText.emerald}`}>
                  Testler
                </h3>
                <TestList
                  cats={tests[g] || []}
                  studentName={studentFullName}
                  solvedSet={solvedSet}
                />
              </Collapsible>
            ))}
          </Card>

          {/* SAĞ: Üstte Aktif Ödevler, altında Kişisel Bilgiler ve İstatistikler */}
          <div className="flex flex-col gap-8">
            <Card className="p-7 md:p-8">
              <SectionHeader icon={ClipboardList} color="rose">
                Aktif Ödevler
              </SectionHeader>
              <p className="text-center text-sm leading-7 text-slate-600">
                Şimdilik ödev bulunmuyor.
              </p>
            </Card>

            <Card className="p-7 md:p-8">
              <SectionHeader icon={User2} color="violet">
                Kişisel Bilgiler
              </SectionHeader>
              <dl className="divide-y divide-slate-200 text-sm">
                <div className="grid grid-cols-2 gap-y-2 py-3">
                  <dt className="font-medium text-slate-600">Ad</dt>
                  <dd className="text-right">{firstName}</dd>
                </div>
                <div className="grid grid-cols-2 gap-y-2 py-3">
                  <dt className="font-medium text-slate-600">Soyad</dt>
                  <dd className="text-right">{lastName}</dd>
                </div>
                <div className="grid grid-cols-2 gap-y-2 py-3">
                  <dt className="font-medium text-slate-600">E-posta</dt>
                  <dd className="text-right">{user?.email || "-"}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-7 md:p-8">
              <SectionHeader icon={BarChart3} color="amber">
                İstatistikler
              </SectionHeader>
              <p className="text-center text-sm leading-7 text-slate-600">
                Yakında burada görünecek.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
