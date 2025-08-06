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

const ANSWER_KEY_REGEX = /^(\d+\/[A-D](,\s*\d+\/[A-D])*)$/i;

const genTempPass = () =>
  Array.from({ length: 10 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
      Math.floor(Math.random() * 62)
    )
  ).join("");

export default function AdminDashboard() {
  /* ───────────── Sistem istatistikleri ───────────── */
  const [stats, setStats] = useState({ students: 0, tests: 0 });
  const fetchStats = async () => {
    const studentsSnap = await getCountFromServer(collection(db, "students"));
    const testsSnap = await getCountFromServer(collection(db, "tests"));
    setStats({
      students: studentsSnap.data().count,
      tests: testsSnap.data().count,
    });
  };

  /* ───────────── Kategoriler ───────────── */
  const [categories, setCategories] = useState([]);
  const fetchCategories = async () => {
    const snap = await getDocs(collection(db, "kategoriAdlari"));
    setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  /* ───────────── İlk yükleme ───────────── */
  useEffect(() => {
    fetchStats();
    fetchCategories();
  }, []);

  /* ───────────── Öğrenci ekleme ───────────── */
  const [studentForm, setStudentForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });
  const handleStudentChange = (e) =>
    setStudentForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const { email, firstName, lastName, password } = studentForm;
    if (!email || !firstName || !lastName || !password) return;

    try {
      const { user } = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );

      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      await setDoc(doc(db, "students", fullName), {
        email,
        firstName,
        lastName,
        createdAt: serverTimestamp(),
      });

      await sendPasswordResetEmail(auth, email);
      setStudentForm({ email: "", firstName: "", lastName: "", password: "" });
      fetchStats();
      alert("Öğrenci eklendi.");
    } catch (err) {
      alert(err.message);
    }
  };

  /* ───────────── Kategori ekleme ───────────── */
  const [newCategory, setNewCategory] = useState({ name: "" });
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name) return;
    try {
      await addDoc(collection(db, "kategoriAdlari"), newCategory);
      setNewCategory({ name: "" });
      fetchCategories();
      alert("Kategori eklendi.");
    } catch (err) {
      alert(err.message);
    }
  };

  /* ───────────── Test ekleme ───────────── */
  const [testData, setTestData] = useState({
    collection: "",
    grade: "",
    name: "",
    link: "",
    questionCount: "",
    answerKey: "",
  });
  
  const handleTestChange = (e) => {
    const { name, value } = e.target;

    // Test verilerini güncelle
    setTestData((prev) => ({ ...prev, [name]: value }));

    // Cevap anahtarı alanı yazılırken canlı doğrulama
    if (name === "answerKey") {
      setAnswerKeyErr(
        value === "" || ANSWER_KEY_REGEX.test(value)
          ? ""                                   // geçerli (veya boş) → hata yok
          : "Format: 1/A,2/B,3/C …"              // geçersiz → mesaj göster
      );
    }
  };

  const handleAddTest = async (e) => {
    e.preventDefault();
    const { collection: coll, grade, name, link, questionCount, answerKey } = testData;
    if (!coll || !grade || !name || !link || !questionCount || !answerKey) return;

    if (!ANSWER_KEY_REGEX.test(answerKey)) {
      setAnswerKeyErr("Format: 1/A,2/B,3/C …");
      return;
    }

    try {
      await addDoc(collection(db, coll), {
        grade: Number(grade),
        name,
        link,
        questionCount: Number(questionCount),
        answerKey,                // 👈 Firestore’a ham metin olarak kaydet
        createdAt: serverTimestamp(),
      });
      setTestData({
        collection: "",
        grade: "",
        name: "",
        link: "",
        questionCount: "",
        answerKey: "",           // 👈 temizle
      });
      fetchStats();
      alert("Test kaydedildi.");
    } catch (err) {
      alert(err.message);
    }
  };

  /* ───────────── Slayt ekleme ───────────── */
  const [slideData, setSlideData] = useState({ grade: "", name: "", link: "" });
  const handleSlideChange = (e) =>
    setSlideData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleAddSlide = async (e) => {
    e.preventDefault();
    const { grade, name, link } = slideData;
    if (!grade || !name || !link) return;

    try {
      await addDoc(collection(db, "KONU ANLATIM SLAYTLARI"), {
        grade: Number(grade),
        name,
        link,
        createdAt: serverTimestamp(),
      });
      setSlideData({ grade: "", name: "", link: "" });
      alert("Slayt kaydedildi.");
    } catch (err) {
      alert(err.message);
    }
  };

  const [answerKeyErr, setAnswerKeyErr] = useState("");
  const handleAnswerKeyBlur = () => {
    if (!testData.answerKey) return;           // boşken hata verme
    setAnswerKeyErr(
      ANSWER_KEY_REGEX.test(testData.answerKey)
        ? ""                                   // geçerli
        : "Format: 1/A,2/B,3/C …"              // mesaj
    );
  };

  /* ───────────── Deneme ekleme ───────────── */
  const [examData, setExamData] = useState({ grade: "", name: "", questionCount: "", duration: "", link: "" });
  const handleExamChange = (e) => setExamData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleAddExam = async (e) => {
    e.preventDefault();
    const { grade, name, questionCount, duration, link } = examData;
    if (!grade || !name || !questionCount || !duration || !link) return;
    try {
      await addDoc(collection(db, "DENEMELER"), { grade: +grade, name, questionCount: +questionCount, duration: +duration, createdAt: serverTimestamp(), link });
      setExamData({ grade: "", name: "", questionCount: "", duration: "" });
      alert("Deneme kaydedildi.");
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-8 text-gray-100">
      <h1 className="mb-8 text-3xl font-bold">Admin Paneli</h1>

      {/* Üst grid: 3 sütun */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* ───── Öğrenci ekleme ───── */}
        <section className="rounded-xl bg-neutral-900 p-6 shadow ring-1 ring-neutral-800">
          <h2 className="mb-4 text-xl font-semibold">Öğrenci Ekle</h2>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <input
              name="email"
              type="email"
              value={studentForm.email}
              onChange={handleStudentChange}
              placeholder="E-posta"
              className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="firstName"
                value={studentForm.firstName}
                onChange={handleStudentChange}
                placeholder="Ad"
                className="rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <input
                name="lastName"
                value={studentForm.lastName}
                onChange={handleStudentChange}
                placeholder="Soyad"
                className="rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <div className="flex gap-2">
              <input
                name="password"
                value={studentForm.password}
                onChange={handleStudentChange}
                placeholder="Geçici Parola"
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

        {/* ───── Kategori ekleme ───── */}
        <section className="rounded-xl bg-neutral-900 p-6 shadow ring-1 ring-neutral-800">
          <h2 className="mb-4 text-xl font-semibold">Kategori Ekle</h2>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <input
              value={newCategory.name}
              onChange={(e) =>
                setNewCategory((p) => ({ ...p, name: e.target.value }))
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

        {/* ───── İstatistikler ───── */}
        <section className="rounded-xl bg-neutral-900 p-6 shadow ring-1 ring-neutral-800">
          <h2 className="mb-4 text-xl font-semibold">Sistem İstatistikleri</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-blue-400">
                {stats.students}
              </span>{" "}
              öğrenci kayıtlı
            </p>
            <p>
              <span className="font-semibold text-blue-400">{stats.tests}</span>{" "}
              test mevcut
            </p>
          </div>
        </section>

        {/* ───── Test + Slayt ekleme (yan yana) ───── */}
        <section className="rounded-xl bg-neutral-900 p-6 shadow ring-1 ring-neutral-800 md:col-span-3">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Test formu */}
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
                    name="collection"
                    value={testData.collection}
                    onChange={handleTestChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="" disabled>
                      Seçiniz
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sınıf */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Sınıf
                  </label>
                  <select
                    name="grade"
                    value={testData.grade}
                    onChange={handleTestChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="" disabled>
                      Seçiniz
                    </option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                  </select>
                </div>

                {/* Test adı */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Test Adı
                  </label>
                  <input
                    name="name"
                    value={testData.name}
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
                    name="link"
                    value={testData.link}
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
                    name="questionCount"
                    type="number"
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
                    name="answerKey"
                    value={testData.answerKey}
                    onChange={handleTestChange}
                    onBlur={handleAnswerKeyBlur}
                    placeholder="1/A,2/B,3/C …"
                    rows={3}
                    className={`
                      w-full resize-y rounded-lg bg-neutral-800 p-4 text-sm font-mono
                      tracking-wider leading-relaxed focus:outline-none
                      focus:ring-2
                      ${answerKeyErr ? "ring-2 ring-red-600 focus:ring-red-600"
                                    : "focus:ring-blue-600"}
                    `}
                    required
                  />

                  {/* Sadece metinle uyarı */}
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

            {/* Slayt formu */}
            <div>
              <h2 className="mb-4 text-xl font-semibold">Slayt Ekle</h2>
              <form onSubmit={handleAddSlide} className="space-y-4">
                {/* Sınıf */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Sınıf
                  </label>
                  <select
                    name="grade"
                    value={slideData.grade}
                    onChange={handleSlideChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="" disabled>
                      Seçiniz
                    </option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                  </select>
                </div>

                {/* Slayt adı */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Slayt Adı
                  </label>
                  <input
                    name="name"
                    value={slideData.name}
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
                    name="link"
                    value={slideData.link}
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
            {/* DENEME FORMU */}
            <div>
              <h2 className="mb-4 text-xl font-semibold">Deneme Ekle</h2>
              <form onSubmit={handleAddExam} className="space-y-4">
                {/* Sınıf */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Sınıf</label>
                  <select
                    name="grade"
                    value={examData.grade}
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
                  <label className="mb-1 block text-xs font-medium text-gray-400">Deneme Adı</label>
                  <input
                    name="name"
                    value={examData.name}
                    onChange={handleExamChange}
                    placeholder="Ör. 8. Sınıf TYT-1"
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* Soru sayısı */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Soru Sayısı</label>
                  <input
                    name="questionCount"
                    type="number"
                    value={examData.questionCount}
                    onChange={handleExamChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* Süre (dakika) */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Süre (dk)</label>
                  <input
                    name="duration"
                    type="number"
                    value={examData.duration}
                    onChange={handleExamChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* link */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Link</label>
                  <input
                    name="link"
                    value={examData.link}
                    onChange={handleExamChange}
                    className="w-full rounded-md bg-neutral-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <button type="submit" className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500">
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
