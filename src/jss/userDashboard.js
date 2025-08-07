import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { db } from "../firebaseConfig";
import { useAuth } from "./context/authContext";

/* ——— Yardımcı: tarih → “gg.aa.yyyy - ss:dd” ——— */
const fmt = (d) =>
  d?.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ——— Katlanabilir blok ——— */
const Collapsible = ({ title, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div className="mb-5 overflow-hidden rounded-xl bg-neutral-800/50 ring-1 ring-neutral-700/60">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-gradient-to-r from-blue-600/30 to-blue-800/20 px-4 py-2 text-base font-medium hover:bg-blue-700/30"
      >
        {title}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="px-4 py-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ——— Slayt listesi ——— */
const SlideList = ({ cats }) =>
  cats.length ? (
    cats.map(({ cat, list }) => (
      <div key={cat} className="mb-3">
        <p className="font-medium text-blue-300">{cat}</p>
        <ul className="ml-4 list-disc space-y-1 text-sm">
          {list.map((s, i) => (
            <li key={i}>
              {s.link ? (
                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-400"
                >
                  {s.name}
                </a>
              ) : (
                s.name
              )}
            </li>
          ))}
        </ul>
      </div>
    ))
  ) : (
    <p className="text-xs text-gray-400">Bu sınıf için slayt yok.</p>
  );

/* ——— Test listesi ——— */
const TestList = ({ cats }) =>
  cats.length ? (
    cats.map(({ cat, list }) => {
      const isDeneme = /deneme/i.test(cat);
      return (
        <div key={cat} className="mb-3">
          <p className="font-medium text-green-300">{cat}</p>
          <ul className="ml-4 list-disc space-y-2 text-sm">
            {list.map((t, i) => (
              <li
                key={i}
                className="flex flex-col gap-2 md:flex-row md:items-center"
              >
                {/* Test PDF / görüntü linki */}
                <span>
                  {t.link ? (
                    <a
                      href={t.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-400"
                    >
                      {t.name}
                    </a>
                  ) : (
                    t.name
                  )}
                  {isDeneme && t.closing && (
                    <span className="ml-2 text-xs text-gray-400">
                      kapanış: {fmt(t.closing)}
                    </span>
                  )}
                </span>

                {/* Çöz -> optik form */}
                <button
                  onClick={() =>
                    window.open(
                      `/optik?count=${t.questionCount ?? 20}`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="inline-flex w-max items-center justify-center rounded-md bg-blue-700 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600"
                >
                  Çöz
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    })
  ) : (
    <p className="text-xs text-gray-400">Bu sınıf için test yok.</p>
  );

export default function UserDashboard() {
  const { user } = useAuth();
  const GRADES = [5, 6, 7, 8];

  const [slides, setSlides] = useState({});
  const [tests, setTests] = useState({});
  const [profile, setProfile] = useState(null);

  /* ——— Profil ——— */
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "students", user.uid))
      .then((snap) => snap.exists() && setProfile(snap.data()))
      .catch((e) => console.error("Profil çekilemedi:", e));
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
            /* —— Slaytlar —— */
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

            /* —— Testler —— */
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
                    questionCount: d.questionCount ?? d.count ?? 20, // ✨
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
  }, []);

  /* ——— Ad / Soyad ——— */
  const { firstName, lastName } = useMemo(() => {
    const fn =
      profile?.firstName ??
      profile?.firstname ??
      profile?.ad ??
      (user?.displayName?.split(" ")[0] ?? "—");
    const ln =
      profile?.lastName ??
      profile?.lastname ??
      profile?.soyad ??
      (user?.displayName?.split(" ").slice(1).join(" ") || "—");
    return { firstName: fn, lastName: ln };
  }, [profile, user]);

  /* ——— UI ——— */
  return (
    <section className="min-h-screen bg-neutral-950 px-4 py-8 text-gray-200 md:px-8">
      <h1 className="mb-10 text-center text-3xl font-extrabold tracking-wide text-white">
        Öğrenci Paneli
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* —— SOL —— */}
        <div className="rounded-2xl bg-neutral-900/70 p-6 ring-1 ring-neutral-800 backdrop-blur">
          <h2 className="mb-6 text-center text-lg font-semibold text-blue-400">
            Slaytlar &amp; Testler
          </h2>

          {GRADES.map((g) => (
            <Collapsible key={g} title={`${g}. Sınıf`}>
              <h3 className="text-sm font-semibold text-blue-300">Slaytlar</h3>
              <SlideList cats={slides[g] || []} />

              <h3 className="mt-4 text-sm font-semibold text-green-300">
                Testler
              </h3>
              <TestList cats={tests[g] || []} />
            </Collapsible>
          ))}
        </div>

        {/* —— ORTA —— */}
        <div className="rounded-2xl bg-neutral-900/70 p-6 ring-1 ring-neutral-800 backdrop-blur">
          <h2 className="mb-6 text-center text-lg font-semibold text-red-400">
            Aktif Ödevler
          </h2>
          <p className="text-center text-sm text-gray-400">
            Şimdilik ödev bulunmuyor.
          </p>
        </div>

        {/* —— SAĞ —— */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl bg-neutral-900/70 p-6 ring-1 ring-neutral-800 backdrop-blur">
            <h2 className="mb-6 text-center text-lg font-semibold text-violet-400">
              Kişisel Bilgiler
            </h2>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium">Ad</dt>
                <dd>{firstName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Soyad</dt>
                <dd>{lastName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">E-posta</dt>
                <dd>{user?.email || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl bg-neutral-900/70 p-6 ring-1 ring-neutral-800 backdrop-blur">
            <h2 className="mb-6 text-center text-lg font-semibold text-violet-400">
              İstatistikler
            </h2>
            <p className="text-center text-sm text-gray-400">
              Yakında burada görünecek.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
