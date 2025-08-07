// src/jss/login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { auth, db } from "../firebaseConfig";
import { useAuth } from "./context/authContext";
import bgImage from "../assets/backg.jpg";
import Logo    from "../assets/logo.png";
import BottomNav from "./components/bottomNav";

const ADMIN_EMAIL = "admin@mail.com";

export default function Login() {
  const navigate   = useNavigate();
  const { startLoading, stopLoading } = useAuth();

  /* ——— State ——— */
  const [formData, setFormData]       = useState({ email: "", password: "" });
  const [showPwd,  setShowPwd ]       = useState(false);
  const [remember, setRemember]       = useState(false);
  const [loading,  setLoading ]       = useState(false);
  const [error,    setError   ]       = useState("");

  const [slides,     setSlides]       = useState([]);   // [{ category, slides: [] }]
  const [categories, setCategories]   = useState([]);   // test kategorileri
  const [selectedGrade, setSelectedGrade] = useState(5);

  /* ——— Tarih biçimlendirici ——— */
  const fmt = (date) =>
    date?.toLocaleString("tr-TR", {
      day:    "2-digit",
      month:  "2-digit",
      year:   "numeric",
      hour:   "2-digit",
      minute: "2-digit",
    });

  /* ——— Firestore’dan veri çek ——— */
  useEffect(() => {
    const fetchData = async () => {
      try {
        /* ───── SLAYTLAR ───── */
        const slideCatSnap  = await getDocs(collection(db, "slaytKategoriAdlari"));
        const slideCatNames = slideCatSnap.docs.map((d) => d.data().name);

        const fetchSlides = async (cat) => {
          const snap = await getDocs(
            query(collection(db, cat), where("grade", "==", selectedGrade))
          );
          return snap.docs.map((s) => ({
            name: s.data().name,
            link: s.data().link || "",
          }));
        };

        const slideLists = await Promise.all(
          slideCatNames.map(async (cat) => ({
            category: cat,
            slides:   await fetchSlides(cat),
          }))
        );

        // boş kategorileri çıkar
        setSlides(slideLists.filter((c) => c.slides.length));

        /* ───── TESTLER ───── */
        const testCatSnap  = await getDocs(collection(db, "kategoriAdlari"));
        const testCatNames = testCatSnap.docs.map((d) => d.data().name);

        const fetchTests = async (cat) => {
          const snap = await getDocs(
            query(collection(db, cat), where("grade", "==", selectedGrade))
          );
          return snap.docs.map((t) => {
            const data   = t.data();
            const start  = data.createdAt?.toDate?.() ?? null;
            const end    = start
              ? new Date(start.getTime() + (data.duration || 0) * 60_000)
              : null;
            return {
              name:    data.name,
              link:    data.link || "",
              closing: end,          // deneme kapanış zamanı
            };
          });
        };

        const testList = await Promise.all(
          testCatNames.map(async (cat) => ({
            category: cat,
            tests:    await fetchTests(cat),
          }))
        );

        setCategories(testList.filter((c) => c.tests.length));
      } catch (err) {
        console.error("Firestore veri çekme hatası:", err);
      }
    };

    fetchData();
  }, [selectedGrade]);

  /* ——— Login formu gönder ——— */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    startLoading();
    setError("");

    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );
      const { user } = await signInWithEmailAndPassword(
        auth, formData.email, formData.password
      );
      navigate(user.email === ADMIN_EMAIL ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  /* ——— Slayt & Test listeleri ——— */
  const SlideList = () => (
    <>
      {slides.length ? (
        slides.map((cat) => (
          <div key={cat.category} className="mb-4">
            <p className="font-medium text-green-300">{cat.category}</p>

            <ul className="ml-4 list-disc text-sm space-y-1">
              {cat.slides.map((s, idx) => (
                <li key={idx}>
                  {s.link ? (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-300"
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
      )}
    </>
  );

  const TestList = () => (
    <>
      {categories.length ? (
        categories.map((cat) => {
          const isDeneme = /deneme/i.test(cat.category);
          return (
            <div key={cat.category} className="mb-4">
              <p className="font-medium text-green-300">{cat.category}</p>
              <ul className="ml-4 list-disc text-sm space-y-1">
                {cat.tests.map((t, idx) => (
                  <li
                    key={idx}
                    className="flex flex-col md:flex-row md:items-center gap-1"
                  >
                    {t.link ? (
                      <a
                        href={t.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-300"
                      >
                        {t.name}
                      </a>
                    ) : (
                      t.name
                    )}

                    {isDeneme && t.closing && (
                      <span className="text-xs text-gray-400">
                        kapanış saati: {fmt(t.closing)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      ) : (
        <p className="text-xs text-gray-400">Bu sınıf için test yok.</p>
      )}
    </>
  );

  /* ——— UI ——— */
  return (
    <section
      className="relative flex min-h-screen flex-col items-center
                justify-center bg-cover bg-center px-4 py-8
                pb-[calc(88px+env(safe-area-inset-bottom))]"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
        {/* SÜTUN 1 — Slaytlar */}
        <aside className="hidden rounded-xl bg-neutral-900/70 p-4 text-gray-200 shadow ring-1 ring-neutral-700/60 backdrop-blur md:block">
          <h2 className="mb-3 text-lg font-semibold text-blue-400">
            Konu Anlatım Slaytları
          </h2>
          <SlideList />
        </aside>

        {/* SÜTUN 2 — Giriş formu */}
        <form
          onSubmit={handleSubmit}
          className="relative mx-auto w-full max-w-sm space-y-6 rounded-xl bg-neutral-900/70 p-8 shadow-2xl ring-1 ring-neutral-700/60 backdrop-blur"
        >
          {/* Logo */}
          <div className="absolute left-1/2 -top-[30px] z-10 flex h-[100px] w-[100px] -translate-x-1/2 items-center justify-center overflow-hidden rounded-full bg-neutral-800/80 ring-1 ring-neutral-600/60 backdrop-blur">
            <img src={Logo} alt="Site Logosu" className="h-full w-full object-contain" />
          </div>

          <h1 className="pt-10 text-center text-2xl font-semibold text-gray-200">
            Giriş Yap
          </h1>

          {error && (
            <p className="rounded-md bg-red-500/20 p-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {/* E-posta */}
          <div className="space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                placeholder="e-mail"
                value={formData.email}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, email: e.target.value }))
                }
                className="w-full rounded-md border border-neutral-700 bg-neutral-800/70 py-3 pl-10 pr-3 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Şifre */}
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type={showPwd ? "text" : "password"}
                name="password"
                placeholder="şifre"
                value={formData.password}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, password: e.target.value }))
                }
                className="w-full rounded-md border border-neutral-700 bg-neutral-800/70 py-3 pl-10 pr-10 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Beni hatırla */}
          <label className="flex items-center gap-2 pt-1 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
              className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-blue-500 focus:ring-0"
            />
            Beni Hatırla
          </label>

          {/* Gönder */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-gradient-to-r from-blue-700 to-blue-900 py-3 text-sm font-medium tracking-wide text-white hover:from-blue-600 hover:to-blue-800 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Giriş"}
          </button>
        </form>

        {/* SÜTUN 3 — Testler */}
        <aside className="hidden rounded-xl bg-neutral-900/70 p-4 text-gray-200 shadow ring-1 ring-neutral-700/60 backdrop-blur md:block">
          <h2 className="mb-3 text-lg font-semibold text-blue-400">
            Testler
          </h2>
          <TestList />
        </aside>
      </div>

      {/* ——— Mobil görünüm ——— */}
      <div className="mt-6 w-full max-w-sm space-y-4 md:hidden">
        <details className="rounded-xl bg-neutral-900/70 p-4 text-gray-200 shadow ring-1 ring-neutral-700/60 backdrop-blur">
          <summary className="cursor-pointer text-lg font-semibold text-blue-400">
            Konu Anlatım Slaytları
          </summary>
          <SlideList />
        </details>

        <details className="rounded-xl bg-neutral-900/70 p-4 text-gray-200 shadow ring-1 ring-neutral-700/60 backdrop-blur">
          <summary className="cursor-pointer text-lg font-semibold text-blue-400">
            Testler
          </summary>
          <TestList />
        </details>
      </div>

      <BottomNav
        className="fixed inset-x-0 bottom-0 z-20"
        active={selectedGrade}
        onSelect={setSelectedGrade}
      />
    </section>
  );
}
