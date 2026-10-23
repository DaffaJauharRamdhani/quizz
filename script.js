
"use strict";

/* =========================================
   QUIZ ADVENTURE
   HTML: index.html
   CSS: style.css
   Penyimpanan: localStorage
   ========================================= */

const SUBJECTS = [
  "Pengetahuan Umum",
  "Sains",
  "Teknologi",
  "Sejarah",
  "Agama Islam",
  "Matematika"
];

const QUESTION_KEY = "quizAdventureQuestions";
const RESULT_KEY = "quizAdventureResults";
const CERT_KEY = "quizAdventureCertificates";

const introScreen = document.getElementById("introScreen");
const loginScreen = document.getElementById("loginScreen");
const mainScreen = document.getElementById("mainScreen");

const startButton = document.getElementById("startButton");
const backToIntro = document.getElementById("backToIntro");
const loginForm = document.getElementById("loginForm");
const togglePassword = document.getElementById("togglePassword");
const logoutButton = document.getElementById("logoutButton");
const brandHome = document.getElementById("brandHome");

const roleInput = document.getElementById("role");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const displayName = document.getElementById("displayName");
const roleDescription = document.getElementById("roleDescription");
const studentContent = document.getElementById("studentContent");
const teacherContent = document.getElementById("teacherContent");
const qaPanel = document.getElementById("qaPanel");
const toast = document.getElementById("toast");

let toastTimeout;
let currentUser = "";
let currentRole = "";
let activeSubject = SUBJECTS[0];
let editingId = null;
let quizSubject = SUBJECTS[0];

/* =========================================
   FUNGSI DASAR
   ========================================= */

function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error("Gagal membaca data:", key, error);
    return [];
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Gagal menyimpan data:", error);
    showToast("Penyimpanan gagal. Periksa ruang penyimpanan browser.");
    return false;
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function showScreen(screen) {
  [introScreen, loginScreen, mainScreen].forEach(item => {
    item.classList.remove("active");
  });

  screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPanel(html) {
  studentContent.hidden = true;
  teacherContent.hidden = true;
  qaPanel.hidden = false;
  qaPanel.innerHTML = html;

  qaPanel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function backToMenu() {
  qaPanel.hidden = true;

  if (currentRole === "guru") {
    studentContent.hidden = true;
    teacherContent.hidden = false;
  } else {
    studentContent.hidden = false;
    teacherContent.hidden = true;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function questionsFor(subject) {
  return read(QUESTION_KEY).filter(question =>
    question.subject === subject
  );
}

function subjectOptions(selected) {
  return SUBJECTS.map(subject => `
    <option value="${escapeHTML(subject)}"
      ${subject === selected ? "selected" : ""}>
      ${escapeHTML(subject)}
    </option>
  `).join("");
}

function subjectPicker(selected) {
  return `
    <label class="qa-field">
      Pelajaran
      <select id="qaSubject">
        ${subjectOptions(selected)}
      </select>
    </label>
  `;
}

function requireRole(role) {
  if (currentRole !== role) {
    showToast(
      role === "guru"
        ? "Fitur ini hanya tersedia untuk Guru."
        : "Fitur ini hanya tersedia untuk Murid."
    );

    return false;
  }

  return true;
}

/* =========================================
   INTRO DAN LOGIN
   ========================================= */

startButton.addEventListener("click", () => {
  showScreen(loginScreen);
});

backToIntro.addEventListener("click", () => {
  showScreen(introScreen);
});

togglePassword.addEventListener("click", () => {
  const hidden = passwordInput.type === "password";

  passwordInput.type = hidden ? "text" : "password";
  togglePassword.textContent = hidden ? "Sembunyikan" : "Lihat";
});

loginForm.addEventListener("submit", event => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const selectedRole = roleInput.value;

  if (!username) {
    showToast("Silakan masukkan nama pengguna.");
    return;
  }

  if (password.length < 6) {
    showToast("Kata sandi minimal 6 karakter.");
    return;
  }

  if (!["murid", "guru"].includes(selectedRole)) {
    showToast("Peran pengguna tidak valid.");
    return;
  }

  currentUser = username;
  currentRole = selectedRole;
  displayName.textContent = username;

  qaPanel.hidden = true;

  if (currentRole === "murid") {
    studentContent.hidden = false;
    teacherContent.hidden = true;

    roleDescription.textContent =
      "Pilih pelajaran, kerjakan kuis, dan raih sertifikat.";
  } else {
    studentContent.hidden = true;
    teacherContent.hidden = false;

    roleDescription.textContent =
      "Kelola soal dan periksa hasil belajar murid.";
  }

  showScreen(mainScreen);
  showToast(`Selamat datang, ${username}!`);
});

logoutButton.addEventListener("click", () => {
  loginForm.reset();

  passwordInput.type = "password";
  togglePassword.textContent = "Lihat";

  currentUser = "";
  currentRole = "";
  editingId = null;

  qaPanel.hidden = true;

  showScreen(loginScreen);
  showToast("Kamu telah keluar dari dashboard.");
});

brandHome.addEventListener("click", event => {
  event.preventDefault();

  if (!currentRole) {
    showScreen(loginScreen);
    return;
  }

  backToMenu();
});

/* =========================================
   PENGELOLAAN SOAL GURU
   ========================================= */

function renderTeacher() {
  if (!requireRole("guru")) return;

  const questions = questionsFor(activeSubject);

  const editing = editingId
    ? read(QUESTION_KEY).find(question => question.id === editingId)
    : null;

  if (editing && editing.subject !== activeSubject) {
    editingId = null;
    renderTeacher();
    return;
  }

  showPanel(`
    <div class="qa-top">
      <div>
        <h2>Kelola Soal</h2>
        <p class="qa-muted">
          Tambahkan, edit, dan hapus soal kuis.
        </p>
      </div>

      <button class="qa-btn qa-light" data-action="back">
        ← Menu utama
      </button>
    </div>

    ${subjectPicker(activeSubject)}

    <div class="qa-message">
      <strong>Jumlah soal: ${questions.length}/50</strong>
      <p class="qa-muted">
        Maksimal 50 soal untuk setiap pelajaran,
        termasuk pilihan ganda dan esai.
      </p>
    </div>

    <form id="questionForm" class="qa-card">
      <h3>${editing ? "Edit Soal" : "Tambah Soal Baru"}</h3>

      <label class="qa-field">
        Jenis soal
        <select name="type" id="questionType" required>
          <option value="mcq"
            ${!editing || editing.type === "mcq" ? "selected" : ""}>
            Pilihan ganda
          </option>
          <option value="essay"
            ${editing?.type === "essay" ? "selected" : ""}>
            Esai
          </option>
        </select>
      </label>

      <label class="qa-field">
        Pertanyaan
        <textarea name="question" maxlength="1000" required
          placeholder="Tulis pertanyaan di sini...">${escapeHTML(editing?.question || "")}</textarea>
      </label>

      <div id="choiceFields" ${editing?.type === "essay" ? "hidden" : ""}>
        ${[0, 1, 2, 3].map(index => `
          <label class="qa-field">
            Pilihan ${"ABCD"[index]}
            <input name="choice${index}" maxlength="300"
              value="${escapeHTML(editing?.choices?.[index] || "")}"
              ${!editing || editing.type === "mcq" ? "required" : ""}>
          </label>
        `).join("")}

        <label class="qa-field">
          Kunci jawaban
          <select name="correct">
            ${["A", "B", "C", "D"].map((letter, index) => `
              <option value="${index}"
                ${Number(editing?.correct ?? 0) === index ? "selected" : ""}>
                ${letter}
              </option>
            `).join("")}
          </select>
        </label>
      </div>

      <label class="qa-field">
        Jawaban acuan esai
        <textarea name="answer" maxlength="1000"
          placeholder="Isi jawaban acuan untuk diperiksa Guru...">${escapeHTML(editing?.answer || "")}</textarea>
      </label>

      <button class="qa-btn qa-primary" type="submit">
        ${editing ? "Simpan Perubahan" : "Tambah Soal"}
      </button>

      ${editing ? `
        <button class="qa-btn qa-light" type="button"
          data-action="cancel-edit">
          Batal Edit
        </button>
      ` : ""}
    </form>

    <h3>Daftar Soal — ${escapeHTML(activeSubject)}</h3>

    ${
      questions.length
        ? questions.map((question, index) => `
          <article class="qa-card">
            <span class="qa-badge">
              Soal ${index + 1} ·
              ${question.type === "mcq" ? "Pilihan ganda" : "Esai"}
            </span>

            <p><strong>${escapeHTML(question.question)}</strong></p>

            ${
              question.type === "mcq"
                ? `<ol type="A">
                    ${(question.choices || []).map(choice =>
                      `<li>${escapeHTML(choice)}</li>`
                    ).join("")}
                  </ol>
                  <p class="qa-muted">
                    Kunci jawaban: ${"ABCD"[question.correct] || "-"}
                  </p>`
                : `<p class="qa-muted">
                    Jawaban acuan:
                    ${escapeHTML(question.answer || "Belum diisi")}
                  </p>`
            }

            <button class="qa-btn qa-light"
              data-action="edit-question"
              data-id="${escapeHTML(question.id)}">
              Edit
            </button>

            <button class="qa-btn qa-danger"
              data-action="delete-question"
              data-id="${escapeHTML(question.id)}">
              Hapus
            </button>
          </article>
        `).join("")
        : `<div class="qa-card">
            Belum ada soal untuk pelajaran ini.
          </div>`
    }
  `);
}

function saveQuestion(form) {
  const data = new FormData(form);
  const type = String(data.get("type"));
  const questionText = String(data.get("question") || "").trim();
  const questions = read(QUESTION_KEY);

  if (!questionText) {
    showToast("Pertanyaan wajib diisi.");
    return;
  }

  if (!["mcq", "essay"].includes(type)) {
    showToast("Jenis soal tidak valid.");
    return;
  }

  const existing = editingId
    ? questions.find(question => question.id === editingId)
    : null;

  if (editingId && !existing) {
    showToast("Soal yang akan diedit tidak ditemukan.");
    editingId = null;
    renderTeacher();
    return;
  }

  if (!existing && questionsFor(activeSubject).length >= 50) {
    showToast("Pelajaran ini sudah mencapai batas 50 soal.");
    return;
  }

  const choices = type === "mcq"
    ? [0, 1, 2, 3].map(index =>
        String(data.get(`choice${index}`) || "").trim()
      )
    : [];

  if (type === "mcq" && choices.some(choice => !choice)) {
    showToast("Semua pilihan A, B, C, dan D wajib diisi.");
    return;
  }

  const correct = type === "mcq"
    ? Number(data.get("correct"))
    : null;

  if (
    type === "mcq" &&
    (!Number.isInteger(correct) || correct < 0 || correct > 3)
  ) {
    showToast("Pilih kunci jawaban yang valid.");
    return;
  }

  const updatedQuestion = {
    id: existing ? existing.id : makeId(),
    subject: existing ? existing.subject : activeSubject,
    type,
    question: questionText,
    choices,
    correct,
    answer: String(data.get("answer") || "").trim()
  };

  const nextQuestions = existing
    ? questions.map(question =>
        question.id === existing.id ? updatedQuestion : question
      )
    : [...questions, updatedQuestion];

  if (!save(QUESTION_KEY, nextQuestions)) return;

  editingId = null;
  renderTeacher();

  showToast(existing ? "Soal berhasil diperbarui." : "Soal berhasil ditambahkan.");
}

/* =========================================
   KUIS MURID
   ========================================= */

function renderStudentQuiz(subject) {
  if (!requireRole("murid")) return;

  quizSubject = subject;

  const questions = questionsFor(subject);

  if (!questions.length) {
    showPanel(`
      <div class="qa-top">
        <div>
          <h2>${escapeHTML(subject)}</h2>
          <p>Belum ada soal yang ditambahkan Guru.</p>
        </div>
        <button class="qa-btn qa-light" data-action="back">
          ← Menu utama
        </button>
      </div>

      <div class="qa-card">
        Silakan kembali lagi setelah Guru menambahkan soal.
      </div>
    `);

    return;
  }

  showPanel(`
    <div class="qa-top">
      <div>
        <h2>Kuis ${escapeHTML(subject)}</h2>
        <p class="qa-muted">
          ${questions.length} soal. Kerjakan semua pertanyaan.
        </p>
      </div>

      <button class="qa-btn qa-light" data-action="back">
        ← Menu utama
      </button>
    </div>

    <form id="quizForm">
      ${questions.map((question, index) => `
        <article class="qa-card">
          <span class="qa-badge">
            Soal ${index + 1} ·
            ${question.type === "mcq" ? "Pilihan ganda" : "Esai"}
          </span>

          <p><strong>${escapeHTML(question.question)}</strong></p>

          ${
            question.type === "mcq"
              ? (question.choices || []).map((choice, choiceIndex) => `
                <label class="qa-option">
                  <input type="radio"
                    name="answer_${escapeHTML(question.id)}"
                    value="${choiceIndex}" required>
                  <span>
                    <strong>${"ABCD"[choiceIndex]}.</strong>
                    ${escapeHTML(choice)}
                  </span>
                </label>
              `).join("")
              : `<label class="qa-field">
                  Jawaban esai
                  <textarea
                    name="answer_${escapeHTML(question.id)}"
                    maxlength="3000"
                    required
                    placeholder="Tulis jawabanmu di sini..."></textarea>
                </label>`
          }
        </article>
      `).join("")}

      <button class="qa-btn qa-primary" type="submit">
        Kirim Jawaban
      </button>
    </form>
  `);
}

/* =========================================
   NILAI DAN SERTIFIKAT
   ========================================= */

function essayAnswersFor(result) {
  return Array.isArray(result.essayAnswers)
    ? result.essayAnswers
    : [];
}

function isResultGraded(result) {
  return essayAnswersFor(result).every(essay =>
    essay.isCorrect === true || essay.isCorrect === false
  );
}

function calculateScore(result) {
  const essays = essayAnswersFor(result);

  if (!isResultGraded(result)) {
    return null;
  }

  const correctEssays = essays.filter(essay =>
    essay.isCorrect === true
  ).length;

  const totalQuestions = Number(result.totalMcq || 0) + essays.length;
  const correctTotal = Number(result.correctMcq || 0) + correctEssays;

  if (totalQuestions === 0) {
    return 0;
  }

  return Math.round((correctTotal / totalQuestions) * 100);
}

function issueCertificateIfEligible(result) {
  const score = calculateScore(result);

  if (score !== 100) {
    return false;
  }

  const certificates = read(CERT_KEY);

  const existing = certificates.find(certificate =>
    certificate.studentName === result.studentName &&
    certificate.subject === result.subject
  );

  if (existing) {
    return true;
  }

  const certificate = {
    id: makeId(),
    certificateNo: `QA-${Date.now()}`,
    studentName: result.studentName,
    subject: result.subject,
    score: 100,
    date: new Date().toISOString(),
    resultId: result.id
  };

  certificates.push(certificate);

  return save(CERT_KEY, certificates);
}

function renderResult(result) {
  const score = calculateScore(result);
  const pending = !isResultGraded(result);

  const statusHTML = pending
    ? `<p class="qa-status-pending">
         Nilai akhir menunggu pemeriksaan Guru.
       </p>`
    : score === 100
      ? `<p class="qa-status-pass">
           Selamat! Kamu mendapatkan nilai sempurna.
         </p>`
      : `<p class="qa-status-fail">
           Kamu belum memenuhi syarat sertifikat.
         </p>`;

  const certificate = !pending && score === 100
    ? read(CERT_KEY).find(item =>
        item.studentName === result.studentName &&
        item.subject === result.subject
      )
    : null;

  showPanel(`
    <div class="qa-top">
      <div>
        <h2>Hasil Kuis</h2>
        <p>${escapeHTML(result.subject)}</p>
      </div>
      <button class="qa-btn qa-light" data-action="back">
        ← Menu utama
      </button>
    </div>

    <div class="qa-card">
      <div class="qa-result-score">
        <p>Nilai kamu</p>
        <span class="score-number">
          ${pending ? "—" : `${score}`}
        </span>
        <p>${pending ? "Menunggu pemeriksaan esai" : "dari 100"}</p>
      </div>

      ${statusHTML}

      <p>Nama murid: ${escapeHTML(result.studentName)}</p>
      <p>Pelajaran: ${escapeHTML(result.subject)}</p>
      <p>Tanggal: ${formatDate(result.date)}</p>

      ${
        pending
          ? `<p class="qa-muted">
              Jawaban esai harus diperiksa Guru sebelum nilai akhir
              dan kelayakan sertifikat ditentukan.
            </p>`
          : score === 100 && certificate
            ? `
              <p><strong>Sertifikat kelulusan tersedia!</strong></p>
              <button class="qa-btn qa-primary"
                data-action="view-certificate"
                data-id="${escapeHTML(certificate.id)}">
                Lihat Sertifikat
              </button>
              <button class="qa-btn qa-success"
                data-action="download-certificate"
                data-id="${escapeHTML(certificate.id)}">
                Unduh Sertifikat
              </button>
            `
            : `<p class="qa-muted">
                Sertifikat hanya tersedia untuk nilai 100.
                Kamu tetap dapat melihat nilai dan mengerjakan
                kuis lainnya.
              </p>`
      }
    </div>
  `);
}

function renderMyResults() {
  if (!requireRole("murid")) return;

  const results = read(RESULT_KEY).filter(result =>
    result.studentName === currentUser
  );

  showPanel(`
    <div class="qa-top">
      <div>
        <h2>Nilai Saya</h2>
        <p class="qa-muted">Riwayat hasil kuis setiap pelajaran.</p>
      </div>
      <button class="qa-btn qa-light" data-action="back">
        ← Menu utama
      </button>
    </div>

    ${
      results.length
        ? [...results].reverse().map(result => {
            const pending = !isResultGraded(result);
            const score = calculateScore(result);

            return `
              <article class="qa-card">
                <span class="qa-badge">${escapeHTML(result.subject)}</span>
                <h3>${escapeHTML(result.subject)}</h3>
                <p>Tanggal: ${formatDate(result.date)}</p>
                <p>
                  Nilai:
                  <strong>${pending ? "Menunggu pemeriksaan" : score}</strong>
                </p>

                ${
                  pending
                    ? `<p class="qa-status-pending">
                         Jawaban esai sedang menunggu pemeriksaan Guru.
                       </p>`
                    : score === 100
                      ? `<p class="qa-status-pass">
                           Lulus — sertifikat tersedia.
                         </p>`
                      : `<p class="qa-status-fail">
                           Belum lulus sertifikat.
                         </p>`
                }

                <button class="qa-btn qa-light"
                  data-action="view-result"
                  data-id="${escapeHTML(result.id)}">
                  Lihat Nilai
                </button>
              </article>
            `;
          }).join("")
        : `<div class="qa-card">
             Kamu belum memiliki riwayat kuis.
           </div>`
    }
  `);
}

function renderCertificates() {
  if (!requireRole("murid")) return;

  const certificates = read(CERT_KEY).filter(certificate =>
    certificate.studentName === currentUser
  );

  showPanel(`
    <div class="qa-top">
      <div>
        <h2>🏆 Sertifikat Saya</h2>
        <p class="qa-muted">
          Hanya pelajaran dengan nilai 100 yang memperoleh sertifikat.
        </p>
      </div>
      <button class="qa-btn qa-light" data-action="back">
        ← Menu utama
      </button>
    </div>

    ${
      certificates.length
        ? certificates.map(certificate => `
            <article class="qa-card">
              <span class="qa-badge">Sertifikat Kelulusan</span>
              <h3>${escapeHTML(certificate.subject)}</h3>
              <p>Nama: ${escapeHTML(certificate.studentName)}</p>
              <p>Nilai: ${certificate.score}/100</p>
              <p>Nomor: ${escapeHTML(certificate.certificateNo)}</p>
              <p>Tanggal: ${formatDate(certificate.date)}</p>

              <button class="qa-btn qa-primary"
                data-action="view-certificate"
                data-id="${escapeHTML(certificate.id)}">
                Lihat Sertifikat
              </button>

              <button class="qa-btn qa-success"
                data-action="download-certificate"
                data-id="${escapeHTML(certificate.id)}">
                Unduh Sertifikat
              </button>
            </article>
          `).join("")
        : `<div class="qa-card">
             <h3>Belum ada sertifikat</h3>
             <p>
               Kerjakan kuis dan dapatkan nilai 100 untuk memperoleh
               sertifikat kelulusan.
             </p>
           </div>`
    }
  `);
}

function findCertificate(id) {
  return read(CERT_KEY).find(certificate =>
    certificate.id === id &&
    certificate.studentName === currentUser
  );
}

function renderCertificateDetail(id) {
  if (!requireRole("murid")) return;

  const certificate = findCertificate(id);

  if (!certificate) {
    showToast("Sertifikat tidak ditemukan.");
    return;
  }

  showPanel(`
    <div class="qa-top no-print">
      <h2>Sertifikat Kelulusan</h2>
      <button class="qa-btn qa-light" data-action="certificates">
        ← Kembali
      </button>
    </div>

    <article class="qa-certificate">
      <div class="qa-certificate-inner">
        <div class="qa-certificate-trophy">🏆</div>
        <h2>SERTIFIKAT KELULUSAN</h2>
        <p>QUIZ ADVENTURE</p>

        <p>Diberikan kepada:</p>
        <div class="qa-certificate-name">
          ${escapeHTML(certificate.studentName)}
        </div>

        <p>Atas keberhasilannya menyelesaikan kuis pelajaran:</p>
        <div class="qa-certificate-subject">
          ${escapeHTML(certificate.subject)}
        </div>

        <p>Dengan nilai sempurna:</p>
        <h2>100 / 100</h2>

        <p>Tanggal: ${formatDate(certificate.date)}</p>
        <p>Nomor sertifikat: ${escapeHTML(certificate.certificateNo)}</p>
        <p><strong>Quiz Adventure</strong></p>
      </div>
    </article>

    <div class="no-print" style="margin-top:16px;">
      <button class="qa-btn qa-primary"
        data-action="download-certificate"
        data-id="${escapeHTML(certificate.id)}">
        Unduh / Simpan sebagai PDF
      </button>
    </div>
  `);
}

/* =========================================
   HASIL MURID DAN PEMERIKSAAN ESAI GURU
   ========================================= */

function renderTeacherResults() {
  if (!requireRole("guru")) return;

  const results = read(RESULT_KEY);

  showPanel(`
    <div class="qa-top">
      <div>
        <h2>Hasil Murid</h2>
        <p class="qa-muted">
          Lihat nilai dan periksa jawaban esai murid.
        </p>
      </div>
      <button class="qa-btn qa-light" data-action="back">
        ← Menu utama
      </button>
    </div>

    ${
      results.length
        ? [...results].reverse().map(result => {
            const essays = essayAnswersFor(result);
            const pending = !isResultGraded(result);
            const score = calculateScore(result);

            return `
              <article class="qa-card">
                <h3>${escapeHTML(result.studentName)}</h3>
                <p>Pelajaran: ${escapeHTML(result.subject)}</p>
                <p>Tanggal: ${formatDate(result.date)}</p>
                <p>
                  Nilai:
                  <strong>${pending ? "Menunggu pemeriksaan" : score}</strong>
                </p>

                ${
                  essays.length
                    ? essays.map(essay => `
                        <div class="qa-card">
                          <p><strong>Pertanyaan:</strong>
                            ${escapeHTML(essay.question)}
                          </p>
                          <p><strong>Jawaban murid:</strong>
                            ${escapeHTML(essay.response)}
                          </p>
                          <p><strong>Jawaban acuan:</strong>
                            ${escapeHTML(essay.expectedAnswer || "Belum diisi")}
                          </p>

                          <p>
                            Status:
                            ${
                              essay.isCorrect === null
                                ? "Menunggu pemeriksaan"
                                : essay.isCorrect
                                  ? "Benar"
                                  : "Salah"
                            }
                          </p>

                          <button class="qa-btn qa-success"
                            data-action="grade-essay"
                            data-result-id="${escapeHTML(result.id)}"
                            data-essay-id="${escapeHTML(essay.id)}"
                            data-correct="true">
                            Tandai Benar
                          </button>

                          <button class="qa-btn qa-danger"
                            data-action="grade-essay"
                            data-result-id="${escapeHTML(result.id)}"
                            data-essay-id="${escapeHTML(essay.id)}"
                            data-correct="false">
                            Tandai Salah
                          </button>
                        </div>
                      `).join("")
                    : `<p class="qa-muted">
                         Tidak ada soal esai dalam kuis ini.
                       </p>`
                }

                ${
                  !pending && score === 100
                    ? `<p class="qa-status-pass">
                         Murid lulus dan memperoleh sertifikat.
                       </p>`
                    : ""
                }
              </article>
            `;
          }).join("")
        : `<div class="qa-card">
             Belum ada hasil kuis dari murid.
           </div>`
    }
  `);
}

function gradeEssay(resultId, essayId, isCorrect) {
  const results = read(RESULT_KEY);

  const result = results.find(item => item.id === resultId);

  if (!result) {
    showToast("Hasil kuis tidak ditemukan.");
    return;
  }

  const essays = essayAnswersFor(result);

  const essay = essays.find(item => item.id === essayId);

  if (!essay) {
    showToast("Jawaban esai tidak ditemukan.");
    return;
  }

  essay.isCorrect = isCorrect;

  result.essayAnswers = essays;
  result.score = calculateScore(result);

  if (!save(RESULT_KEY, results)) return;

  const score = calculateScore(result);

  if (score === 100) {
    issueCertificateIfEligible(result);
  }

  renderTeacherResults();

  showToast(
    score === 100
      ? "Esai diperiksa. Murid memperoleh nilai 100."
      : isResultGraded(result)
        ? `Pemeriksaan selesai. Nilai akhir: ${score}.`
        : "Jawaban esai telah diperiksa."
  );
}

/* =========================================
   MENGUMPULKAN JAWABAN KUIS
   ========================================= */

function submitQuiz(form) {
  if (!requireRole("murid")) return;

  const questions = questionsFor(quizSubject);
  const data = new FormData(form);

  let correctMcq = 0;
  let totalMcq = 0;
  const essayAnswers = [];

  questions.forEach(question => {
    const response = String(
      data.get(`answer_${question.id}`) || ""
    ).trim();

    if (question.type === "mcq") {
      totalMcq++;

      if (Number(response) === Number(question.correct)) {
        correctMcq++;
      }
    } else {
      essayAnswers.push({
        id: makeId(),
        questionId: question.id,
        question: question.question,
        response,
        expectedAnswer: question.answer || "",
        isCorrect: null
      });
    }
  });

  const result = {
    id: makeId(),
    studentName: currentUser,
    subject: quizSubject,
    date: new Date().toISOString(),
    correctMcq,
    totalMcq,
    essayAnswers,
    score: null
  };

  result.score = calculateScore(result);

  const results = read(RESULT_KEY);
  results.push(result);

  if (!save(RESULT_KEY, results)) return;

  if (isResultGraded(result) && calculateScore(result) === 100) {
    issueCertificateIfEligible(result);
  }

  renderResult(result);
}

/* =========================================
   EVENT TOMBOL DINAMIS
   ========================================= */

document.addEventListener("click", event => {
  const button = event.target.closest("button");

  if (!button) return;

  const action = button.dataset.action;
  const game = button.dataset.game;
  const teacherAction = button.dataset.teacherAction;

  /* Tombol kembali ke menu */
  if (action === "back") {
    backToMenu();
    return;
  }

  /* Tombol kategori pelajaran */
  if (game) {
    if (!requireRole("murid")) return;

    if (SUBJECTS.includes(game)) {
      renderStudentQuiz(game);
    }

    return;
  }

  /* Tombol dashboard Guru */
  if (teacherAction) {
    if (!requireRole("guru")) return;

    if (
      teacherAction === "Buat Kuis" ||
      teacherAction === "Kelola Soal"
    ) {
      editingId = null;
      activeSubject = SUBJECTS[0];
      renderTeacher();
    } else if (teacherAction === "Hasil Murid") {
      renderTeacherResults();
    }

    return;
  }

  /* Menu nilai murid */
  if (action === "my-results") {
    renderMyResults();
    return;
  }

  /* Menu sertifikat */
  if (action === "certificates") {
    renderCertificates();
    return;
  }

  /* Buka detail nilai */
  if (action === "view-result") {
    if (!requireRole("murid")) return;

    const result = read(RESULT_KEY).find(item =>
      item.id === button.dataset.id &&
      item.studentName === currentUser
    );

    if (!result) {
      showToast("Hasil kuis tidak ditemukan.");
      return;
    }

    renderResult(result);
    return;
  }

  /* Buka sertifikat */
  if (action === "view-certificate") {
    renderCertificateDetail(button.dataset.id);
    return;
  }

  /* Unduh/cetak sertifikat */
  if (action === "download-certificate") {
    if (!requireRole("murid")) return;

    const certificate = findCertificate(button.dataset.id);

    if (!certificate || certificate.score !== 100) {
      showToast("Sertifikat tidak tersedia.");
      return;
    }

    renderCertificateDetail(certificate.id);

    // Beri waktu agar tampilan sertifikat selesai diperbarui.
    setTimeout(() => {
      window.print();
    }, 250);

    return;
  }

  /* Edit soal */
  if (action === "edit-question") {
    if (!requireRole("guru")) return;

    const question = read(QUESTION_KEY).find(item =>
      item.id === button.dataset.id
    );

    if (!question) {
      showToast("Soal tidak ditemukan.");
      return;
    }

    activeSubject = question.subject;
    editingId = question.id;

    renderTeacher();
    return;
  }

  /* Batalkan edit */
  if (action === "cancel-edit") {
    editingId = null;
    renderTeacher();
    return;
  }

  /* Hapus soal */
  if (action === "delete-question") {
    if (!requireRole("guru")) return;

    const id = button.dataset.id;

    if (!confirm("Yakin ingin menghapus soal ini?")) {
      return;
    }

    const questions = read(QUESTION_KEY).filter(question =>
      question.id !== id
    );

    if (!save(QUESTION_KEY, questions)) return;

    editingId = null;
    renderTeacher();
    showToast("Soal berhasil dihapus.");
    return;
  }

  /* Pemeriksaan esai */
  if (action === "grade-essay") {
    if (!requireRole("guru")) return;

    const isCorrect = button.dataset.correct === "true";

    gradeEssay(
      button.dataset.resultId,
      button.dataset.essayId,
      isCorrect
    );
  }
});

/* =========================================
   EVENT FORM DINAMIS
   ========================================= */

qaPanel.addEventListener("submit", event => {
  if (event.target.id === "questionForm") {
    event.preventDefault();

    if (!requireRole("guru")) return;

    saveQuestion(event.target);
    return;
  }

  if (event.target.id === "quizForm") {
    event.preventDefault();

    if (!requireRole("murid")) return;

    submitQuiz(event.target);
  }
});

/* =========================================
   EVENT PERUBAHAN PILIHAN
   ========================================= */

qaPanel.addEventListener("change", event => {
  if (event.target.id === "qaSubject") {
    activeSubject = event.target.value;
    editingId = null;
    renderTeacher();
    return;
  }

  if (event.target.id === "questionType") {
    const choiceFields = document.getElementById("choiceFields");

    if (!choiceFields) return;

    const isMcq = event.target.value === "mcq";

    choiceFields.hidden = !isMcq;

    choiceFields.querySelectorAll("input").forEach(input => {
      input.required = isMcq;
    });
  }
});

/* =========================================
   AKHIR SCRIPT
   ========================================= */
