// src/jss/adminDashboard.jsx
import React, { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  addDoc,
  setDoc,
  doc,
  collection,
  getCountFromServer,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, secondaryAuth } from "../firebaseConfig";

/* ——— Doğrulamalar ——— */
const ANSWER_KEY_REGEX = /^[A-D]+$/i;          // Sadece A-D harfleri, aralıksız

/* ——— Geçici parola üreticisi ——— */
const genTempPass = () =>
  Array.from({ length: 10 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
      Math.floor(Math.random() * 62)
    )
  ).join("");

export default function AdminDashboard() {
  /* ────────────────── Sistem istatistikleri ────────────────── */
  const [stats, setStats] = useState({ students: 0, tests: 0 });
  const fetchStats = async () => {
    const studentsSnap = await getCountFromServer(collection(db, "students"));
    const testsSnap    = await getCountFromServer(collection(db, "tests"));
    setStats({
      students: studentsSnap.data().count,
      tests:    testsSnap.data().count,
    });
  };

  /* ────────────────── Kategoriler ────────────────── */
  const [testCategories,  setTestCategories ]  = useState([]);
  const [slideCategories, setSlideCategories]  = useState([]);

  const fetchTestCategories = async () => {
    const snap = await getDocs(collection(db, "kategoriAdlari"));
    setTestCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchSlideCategories = async () => {
    const snap = await getDocs(collection(db, "kategoriAdlari"));
    setSlideCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  /* ────────────────── İlk yükleme ────────────────── */
  useEffect(() => {
    fetchStats();
    fetchTestCategories();
    fetchSlideCategories();
  }, []);

  /* ────────────────── Öğrenci ekleme ────────────────── */
  const [studentForm, setStudentForm] = useState({
    email: "", firstName: "", lastName: "", password: "",
  });
  const handleStudentChange = (e) =>
    setStudentForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const { email, firstName, lastName, password } = studentForm;
    if (!email || !firstName || !lastName || !password) return;

    try {
      await createUserWithEmailAndPassword(secondaryAuth, email, password);

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      await setDoc(doc(db, "students", fullName), {
        email, firstName, lastName, createdAt: serverTimestamp(),
      });

      await sendPasswordResetEmail(auth, email);
      setStudentForm({ email: "", firstName: "", lastName: "", password: "" });
      fetchStats();
      alert("Öğrenci eklendi.");
    } catch (err) { alert(err.message); }
  };

  /* ────────────────── TEST kategorisi ekleme ────────────────── */
  const [newTestCategory, setNewTestCategory] = useState({ name: "" });
  const handleAddTestCategory = async (e) => {
    e.preventDefault();
    if (!newTestCategory.name) return;
    try {
      await addDoc(collection(db, "kategoriAdlari"), newTestCategory);
      setNewTestCategory({ name: "" });
      fetchTestCategories();
      alert("Test kategorisi eklendi.");
    } catch (err) { alert(err.message); }
  };

  /* ────────────────── SLAYT kategorisi ekleme ────────────────── */
  const [newSlideCategory, setNewSlideCategory] = useState({ name: "", grade: "" });
  const handleAddSlideCategory = async (e) => {
    e.preventDefault();
    const { name, grade } = newSlideCategory;
    if (!name || !grade) return;
    try {
      await addDoc(collection(db, "kategoriAdlari"), { name, grade: +grade });
      setNewSlideCategory({ name: "", grade: "" });
      fetchSlideCategories();
      alert("Slayt kategorisi eklendi.");
    } catch (err) { alert(err.message); }
  };

  /* ────────────────── Test ekleme ────────────────── */
  const [answerKeyErr, setAnswerKeyErr] = useState("");
  const [testData, setTestData] = useState({
    collection: "", grade: "", name: "", link: "",
    questionCount: "", answerKey: "",
  });

  const handleTestChange = (e) => {
    const { name, value } = e.target;
    setTestData((p) => ({ ...p, [name]: value }));

    if (name === "answerKey") {
      setAnswerKeyErr(
        value === "" || ANSWER_KEY_REGEX.test(value)
          ? "" : "Sadece A-D harfleri içermeli"
      );
    }
  };

  const handleAnswerKeyBlur = () => {
    if (!testData.answerKey) return;
    const valid = ANSWER_KEY_REGEX.test(testData.answerKey);
    setAnswerKeyErr(valid ? "" : "Sadece A-D harfleri içermeli");
  };

  const handleAddTest = async (e) => {
    e.preventDefault();
    const { collection: coll, grade, name, link, questionCount, answerKey } = testData;
    if (!coll || !grade || !name || !link || !questionCount || !answerKey) return;

    /* — doğrulama — */
    if (
      !ANSWER_KEY_REGEX.test(answerKey) ||
      answerKey.length !== Number(questionCount)
    ) {
      setAnswerKeyErr("Anahtar uzunluğu soru sayısına eşit ve yalnız A-D olmalı");
      return;
    }

    try {
      await addDoc(collection(db, coll), {
        grade: +grade, name, link,
        questionCount: +questionCount,
        answerKey,
        createdAt: serverTimestamp(),
      });
      setTestData({
        collection: "", grade: "", name: "", link: "",
        questionCount: "", answerKey: "",
      });
      fetchStats();
      alert("Test kaydedildi.");
    } catch (err) { alert(err.message); }
  };

  /* ────────────────── Slayt ekleme ────────────────── */
  const [slideData, setSlideData] = useState({
    collection: "", grade: "", name: "", link: "",
  });
  const handleSlideChange = (e) =>
    setSlideData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleAddSlide = async (e) => {
    e.preventDefault();
    const { collection: coll, grade, name, link } = slideData;
    if (!coll || !grade || !name || !link) return;

    try {
      await addDoc(collection(db, coll), {
        grade: +grade, name, link, createdAt: serverTimestamp(),
      });
      setSlideData({ collection: "", grade: "", name: "", link: "" });
      alert("Slayt kaydedildi.");
    } catch (err) { alert(err.message); }
  };

  /* ────────────────── Deneme ekleme ────────────────── */
  const [examData, setExamData] = useState({
    grade: "", name: "", questionCount: "", duration: "", link: "",
  });
  const handleExamChange = (e) =>
    setExamData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleAddExam = async (e) => {
    e.preventDefault();
    const { grade, name, questionCount, duration, link } = examData;
    if (!grade || !name || !questionCount || !duration || !link) return;

    try {
      await addDoc(collection(db, "HAFTALIK DENEMELER"), {
        grade: +grade, name,
        questionCount: +questionCount,
        duration: +duration,
        link,
        createdAt: serverTimestamp(),
      });
      setExamData({ grade: "", name: "", questionCount: "", duration: "" });
      alert("Deneme kaydedildi.");
    } catch (err) { alert(err.message); }
  };

  /* ────────────────── JSX ────────────────── */
  return (
    <div className="min-h-screen bg-neutral-950 p-8 text-gray-100">
      <h1 className="mb-8 text-3xl font-bold">Admin Paneli</h1>

      {/* ——— Üst grid ——— */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* ——— Öğrenci ekleme ——— */}
        <section className="rounded-xl bg-neutral-900 p-6 shadow ring-1 ring-neutral-800">
          <h2 className="mb-4 text-xl font-semibold">Öğrenci Ekle</h2>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <input
              name="email" type="email" value={studentForm.email}
              onChange={handleStudentChange} placeholder="E-posta"
              className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="firstName" value={studentForm.firstName}
                onChange={handleStudentChange} placeholder="Ad"
                className="rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <input
                name="lastName" value={studentForm.lastName}
                onChange={handleStudentChange} placeholder="Soyad"
                className="rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <div className="flex gap-2">
              <input
                name="password" value={studentForm.password}
                onChange={handleStudentChange} placeholder="Geçici Parola"
                className="flex-1 rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <button
                type="button"
                onClick={() =>
                  setStudentForm((p) => ({ ...p, password: genTempPass() }))
                }
                className="rounded-md bg-neutral-700 px-3 text-xs hover:bg-neutral-600"
              >
                Üret
              </button>
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500"
            >
              Ekle
            </button>
          </form>
        </section>

        {/* ——— TEST kategorisi ekleme ——— */}
        <section className="rounded-xl bg-neutral-900 p-6 shadow ring-1 ring-neutral-800">
          <h2 className="mb-4 text-xl font-semibold">Test Kategorisi Ekle</h2>
          <form onSubmit={handleAddTestCategory} className="space-y-4">
            <input
              value={newTestCategory.name}
              onChange={(e) =>
                setNewTestCategory((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Kategori adı"
              className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500"
            >
              Ekle
            </button>
          </form>
        </section>

        {/* ——— SLAYT kategorisi ekleme ——— */}
        <section className="rounded-xl bg-neutral-900 p-6 shadow ring-1 ring-neutral-800">
          <h2 className="mb-4 text-xl font-semibold">Slayt Kategorisi Ekle</h2>
          <form onSubmit={handleAddSlideCategory} className="space-y-4">
            <select
              value={newSlideCategory.grade}
              onChange={(e) =>
                setNewSlideCategory((p) => ({ ...p, grade: e.target.value }))
              }
              className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            >
              <option value="" disabled>Sınıf</option>
              <option value="5">5</option><option value="6">6</option>
              <option value="7">7</option><option value="8">8</option>
            </select>
            <input
              value={newSlideCategory.name}
              onChange={(e) =>
                setNewSlideCategory((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Kategori adı"
              className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500"
            >
              Ekle
            </button>
          </form>
        </section>

        {/* ——— İstatistikler ——— */}
        <section className="rounded-xl bg-neutral-900 p-6 shadow ring-1 ring-neutral-800">
          <h2 className="mb-4 text-xl font-semibold">Sistem İstatistikleri</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-blue-400">{stats.students}</span>{" "}
              öğrenci kayıtlı
            </p>
            <p>
              <span className="font-semibold text-blue-400">{stats.tests}</span>{" "}
              test mevcut
            </p>
          </div>
        </section>

        {/* ——— Test + Slayt + Deneme formları ——— */}
        <section className="rounded-xl bg-neutral-900 p-6 shadow ring-1 ring-neutral-800 md:col-span-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* ——— Test formu ——— */}
            <div>
              <h2 className="mb-4 text-xl font-semibold">Test Ekle</h2>
              <form
                onSubmit={handleAddTest}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"
              >
                {/* Kategori */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Kategori
                  </label>
                  <select
                    name="collection" value={testData.collection}
                    onChange={handleTestChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="" disabled>Seçiniz</option>
                    {testCategories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sınıf */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Sınıf
                  </label>
                  <select
                    name="grade" value={testData.grade}
                    onChange={handleTestChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="" disabled>Seçiniz</option>
                    <option value="5">5</option><option value="6">6</option>
                    <option value="7">7</option><option value="8">8</option>
                  </select>
                </div>

                {/* Test adı */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Test Adı
                  </label>
                  <input
                    name="name" value={testData.name}
                    onChange={handleTestChange}
                    placeholder="Ör. 7.Sınıf Deneme–1"
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* Link */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Test Linki
                  </label>
                  <input
                    name="link" value={testData.link}
                    onChange={handleTestChange}
                    placeholder="https://..."
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* Soru sayısı */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Soru Sayısı
                  </label>
                  <input
                    name="questionCount" type="number"
                    value={testData.questionCount}
                    onChange={handleTestChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* Cevap anahtarı */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Cevap Anahtarı
                  </label>
                  <textarea
                    name="answerKey" rows={3}
                    value={testData.answerKey}
                    onChange={handleTestChange} onBlur={handleAnswerKeyBlur}
                    placeholder="Ör. ABCDABCD..."
                    className={`
                      w-full resize-y rounded-lg bg-neutral-800 p-4 text-sm font-mono tracking-wider leading-relaxed focus:outline-none focus:ring-2
                      ${answerKeyErr ? "ring-2 ring-red-600 focus:ring-red-600" : "focus:ring-blue-600"}
                    `}
                    required
                  />
                  {answerKeyErr && (
                    <p className="mt-1 text-xs text-red-500">{answerKeyErr}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>

            {/* ——— Slayt formu ——— */}
            <div>
              <h2 className="mb-4 text-xl font-semibold">Slayt Ekle</h2>
              <form onSubmit={handleAddSlide} className="space-y-4">
                {/* Kategori */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Kategori
                  </label>
                  <select
                    name="collection" value={slideData.collection}
                    onChange={handleSlideChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="" disabled>Seçiniz</option>
                    {slideCategories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sınıf */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Sınıf
                  </label>
                  <select
                    name="grade" value={slideData.grade}
                    onChange={handleSlideChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="" disabled>Seçiniz</option>
                    <option value="5">5</option><option value="6">6</option>
                    <option value="7">7</option><option value="8">8</option>
                  </select>
                </div>

                {/* Slayt adı */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Slayt Adı
                  </label>
                  <input
                    name="name" value={slideData.name}
                    onChange={handleSlideChange}
                    placeholder="Ör. ‘Üslü Sayılar’"
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* Slayt linki */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Slayt Linki
                  </label>
                  <input
                    name="link" value={slideData.link}
                    onChange={handleSlideChange}
                    placeholder="https://..."
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500"
                >
                  Kaydet
                </button>
              </form>
            </div>

            {/* ——— Deneme formu ——— */}
            <div>
              <h2 className="mb-4 text-xl font-semibold">Deneme Ekle</h2>
              <form onSubmit={handleAddExam} className="space-y-4">
                {/* Sınıf */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Sınıf
                  </label>
                  <select
                    name="grade" value={examData.grade}
                    onChange={handleExamChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="" disabled>Seçiniz</option>
                    <option value="5">5</option><option value="6">6</option>
                    <option value="7">7</option><option value="8">8</option>
                  </select>
                </div>

                {/* Deneme adı */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Deneme Adı
                  </label>
                  <input
                    name="name" value={examData.name}
                    onChange={handleExamChange}
                    placeholder="Ör. 8. Sınıf TYT-1"
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* Soru sayısı */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Soru Sayısı
                  </label>
                  <input
                    name="questionCount" type="number"
                    value={examData.questionCount}
                    onChange={handleExamChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* Süre */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Süre (dk)
                  </label>
                  <input
                    name="duration" type="number"
                    value={examData.duration}
                    onChange={handleExamChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* Link */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Link
                  </label>
                  <input
                    name="link" value={examData.link}
                    onChange={handleExamChange}
                    placeholder="https://..."
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500"
                >
                  Kaydet
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
