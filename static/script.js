async function generateFlashcards() {
  const text = document.getElementById('inputText').value.trim();
  const container = document.getElementById('flashcards');

  container.innerHTML = '';
  const loader = document.createElement('p');
  loader.id = 'loadingText';
  loader.className = 'text-gray-600 animate-pulse';
  loader.textContent = '⚡ Generating flashcards...';
  container.appendChild(loader);

  if (!text) {
    container.innerHTML = `<p class="text-red-600">Please enter your study notes.</p>`;
    return;
  }

  try {
    const res = await fetch('/generate_flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const result = await res.json();

    if (result.status === 'success') {
      container.innerHTML = '';

      if (result.flashcards.length === 0) {
        container.innerHTML = `<p class="text-gray-600">No flashcards could be generated from your input.</p>`;
        return;
      }

      result.flashcards.forEach(flashcard => {
        const card = document.createElement('div');
        card.className = "flashcard relative bg-gradient-to-br from-blue-100 to-purple-100 p-4 rounded-lg shadow hover:shadow-md transition";

        card.innerHTML = `
          <div class="absolute top-2 right-2 flex gap-2">
            <button onclick="enableEditing(this)" class="edit-btn text-blue-600 text-sm hover:opacity-70" title="Edit">📝</button>
            <button onclick="saveFlashcardEdit(this)" class="save-btn text-green-600 text-sm hover:opacity-70 hidden" title="Save">💾</button>
            <button onclick="deleteFlashcard(this)" class="text-red-600 text-sm hover:opacity-70" title="Delete">🗑️</button>
          </div>

          <h3 class="font-bold text-gray-700 mb-2">Question ${flashcard.id}</h3>
          <div contenteditable="false" class="question text-lg font-semibold text-gray-800 border border-transparent rounded p-1 mb-2">
            ${flashcard.question}
          </div>

          <button onclick="toggleAnswer(this)" class="mt-2 text-sm text-blue-600">👁 Show Answer</button>
          <div class="hidden mt-2">
            <div contenteditable="false" class="answer text-gray-700 border border-transparent rounded p-1">
              ${flashcard.answer}
            </div>
          </div>
        `;

        container.appendChild(card);
      });

    } else {
      // Check for login required
      if (result.message && result.message.toLowerCase().includes('login required')) {
        showLoginRequiredPopup();
        container.innerHTML = '';
        return;
      }
      container.innerHTML = `<p class="text-red-600">${result.message || 'Could not generate flashcards. Try different notes.'}</p>`;
    }
  } catch (error) {
    container.innerHTML = `<p class="text-red-600">Something went wrong. Please try again.</p>`;
  }
}

function toggleAnswer(btn) {
  const answer = btn.nextElementSibling;
  const isVisible = !answer.classList.contains('hidden');
  answer.classList.toggle('hidden');
  btn.textContent = isVisible ? "👁 Show Answer" : "🙈 Hide Answer";
}

function toggleExportMenu() {
  const menu = document.getElementById('exportMenu');
  menu.classList.toggle('hidden');
}

function enableEditing(btn) {
  const card = btn.closest('.flashcard');
  const question = card.querySelector('.question');
  const answer = card.querySelector('.answer');
  const editBtn = card.querySelector('.edit-btn');
  const saveBtn = card.querySelector('.save-btn');

  if (question && answer) {
    question.setAttribute('contenteditable', 'true');
    answer.setAttribute('contenteditable', 'true');
    question.classList.add('border-blue-400', 'outline-none');
    answer.classList.add('border-blue-400', 'outline-none');
    editBtn.classList.add('hidden');
    saveBtn.classList.remove('hidden');
    question.focus();
  }
}

function saveFlashcardEdit(btn) {
  const card = btn.closest('.flashcard');
  const question = card.querySelector('.question');
  const answer = card.querySelector('.answer');
  const editBtn = card.querySelector('.edit-btn');
  const saveBtn = card.querySelector('.save-btn');

  if (question && answer) {
    question.setAttribute('contenteditable', 'false');
    answer.setAttribute('contenteditable', 'false');
    question.innerHTML = question.innerText.trim();
    answer.innerHTML = answer.innerText.trim();
    question.classList.remove('border-blue-400');
    answer.classList.remove('border-blue-400');
    saveBtn.classList.add('hidden');
    editBtn.classList.remove('hidden');
    alert('✅ Flashcard saved!');
  }
}

function deleteFlashcard(btn) {
  const card = btn.closest('.flashcard');
  if (card) card.remove();
}

async function exportFlashcardsToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const flashcards = Array.from(document.querySelectorAll("#flashcards .flashcard"));
  const userText = document.getElementById("inputText").value.trim();

  if (flashcards.length === 0 || !userText) {
    alert("Nothing to export. Please generate flashcards first.");
    return;
  }

  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.setFont("helvetica", "bold");
  doc.text("QuizCraft Flashcard Summary", 105, 15, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(50);
  doc.setFont("helvetica", "bold");
  doc.text("User Query:", 14, 30);

  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(userText, 180);
  doc.text(lines, 14, 37);

  const yAfterQuery = 37 + lines.length * 6;
  const tableData = flashcards.map((card, index) => {
    const question = card.querySelector(".question")?.innerText.trim() || "";
    const answer = card.querySelector(".answer")?.innerText.trim() || "";
    return [`Q${index + 1}: ${question}`, `A${index + 1}: ${answer}`];
  });

  doc.autoTable({
    startY: yAfterQuery + 10,
    head: [['Question', 'Answer']],
    body: tableData,
    styles: { fontSize: 11, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, halign: "center" },
    columnStyles: { 0: { cellWidth: 85 }, 1: { cellWidth: 85 } },
    theme: 'striped',
    margin: { top: 10, left: 14, right: 14 },
    didDrawPage: function (data) {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, 105, 290, { align: 'center' });
    }
  });

  doc.save("QuizCraft_Flashcards.pdf");
}

function exportFlashcardsToCSV() {
  const flashcards = Array.from(document.querySelectorAll("#flashcards .flashcard"));
  const userText = document.getElementById("inputText").value.trim();

  if (flashcards.length === 0 || !userText) {
    alert("Nothing to export. Please generate flashcards first.");
    return;
  }

  let csv = "User Query,\n\"" + userText.replace(/"/g, '""') + "\"\n\n";
  csv += "Question,Answer\n";

  flashcards.forEach((card, index) => {
    const question = card.querySelector(".question")?.innerText.trim() || "";
    const answer = card.querySelector(".answer")?.innerText.trim() || "";
    csv += `"${question.replace(/"/g, '""')}","${answer.replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "QuizCraft_Flashcards.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function uploadAudio() {
  const fileInput = document.getElementById('audioFile');
  const uploadStatus = document.getElementById('uploadStatus');
  const container = document.getElementById('flashcards');
  container.innerHTML = ''; // Clear old cards

  if (!fileInput.files.length) {
    alert('Please select an audio file.');
    return;
  }

  uploadStatus.textContent = '⏳ Uploading and transcribing audio...';
  uploadStatus.className = 'text-sm text-gray-600 animate-pulse';

  const formData = new FormData();
  formData.append('audio', fileInput.files[0]);

  try {
    const res = await fetch('/transcribe_audio', {
      method: 'POST',
      body: formData
    });

    const result = await res.json();

    if (result.status === 'success') {
      uploadStatus.textContent = '✅ Transcription successful! Generating flashcards...';
      document.getElementById('inputText').value = result.transcript;
      await generateFlashcards();
      uploadStatus.textContent = '';
    } else {
      uploadStatus.textContent = '❌ ' + result.message;
      uploadStatus.className = 'text-sm text-red-600';
    }
  } catch (err) {
    uploadStatus.textContent = '❌ Upload failed. Try again.';
    uploadStatus.className = 'text-sm text-red-600';
  }
}

// New: Image OCR and flashcard generation using Tesseract.js on client-side
async function uploadImage() {
  const fileInput = document.getElementById('imageFile');
  const imageStatus = document.getElementById('imageStatus');
  const container = document.getElementById('flashcards');
  container.innerHTML = ''; // Clear previous flashcards

  if (!fileInput.files.length) {
    alert('Please select an image file.');
    return;
  }

  const file = fileInput.files[0];
  imageStatus.textContent = '🔍 Scanning image for text...';
  imageStatus.className = 'text-sm text-gray-600 animate-pulse';

  try {
    // Use Tesseract.js to extract text
    const { data: { text } } = await Tesseract.recognize(
      file,
      'eng',
      { logger: m => {
          // Optional: you can update a progress bar here with m.progress
          // console.log(m);
        }
      }
    );

    if (!text.trim()) {
      imageStatus.textContent = '❌ No text found in the image.';
      imageStatus.className = 'text-sm text-red-600';
      return;
    }

    imageStatus.textContent = '✅ Text extracted! Generating flashcards...';
    document.getElementById('inputText').value = text;
    await generateFlashcards();
    imageStatus.textContent = '';
  } catch (error) {
    imageStatus.textContent = '❌ Failed to scan image. Try another one.';
    imageStatus.className = 'text-sm text-red-600';
  }
}


// 👇 Add this at the bottom of your existing script.js

async function uploadPDF() {
  const fileInput = document.getElementById('pdfFile');
  const pdfStatus = document.getElementById('pdfStatus');
  const container = document.getElementById('flashcards');
  container.innerHTML = '';

  if (!fileInput.files.length) {
    alert('Please select a PDF file.');
    return;
  }

  const file = fileInput.files[0];

  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    pdfStatus.textContent = '❌ File too large. Try a smaller chapter or section.';
    pdfStatus.className = 'text-sm text-red-600';
    return;
  }

  pdfStatus.textContent = '📄 Extracting text from PDF...';
  pdfStatus.className = 'text-sm text-gray-600 animate-pulse';

  try {
    const fileReader = new FileReader();
    fileReader.onload = async function() {
      const typedArray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
      let textContent = '';

      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        const pageText = text.items.map(item => item.str).join(' ');
        textContent += pageText + '\n';
      }

      if (!textContent.trim()) {
        pdfStatus.textContent = '❌ No text extracted from PDF.';
        pdfStatus.className = 'text-sm text-red-600';
        return;
      }

      pdfStatus.textContent = '✅ PDF text extracted! Generating flashcards...';
      document.getElementById('inputText').value = textContent;
      await generateFlashcards();
      pdfStatus.textContent = '';
    };

    fileReader.readAsArrayBuffer(file);
  } catch (error) {
    console.error(error);
    pdfStatus.textContent = '❌ Failed to extract PDF. Please try again.';
    pdfStatus.className = 'text-sm text-red-600';
  }
}

document.getElementById("quizInputType").addEventListener("change", e => {
  const container = document.getElementById("quizInputFields");
  const type = e.target.value;

  const fields = {
    text: `<textarea id="quizText" class="w-full p-2 border rounded-md h-32" placeholder="Paste study notes..."></textarea>`,
    audio: `<input type="file" id="quizAudio" accept="audio/*" class="w-full border p-2 rounded-md" />`,
    image: `<input type="file" id="quizImage" accept="image/*" class="w-full border p-2 rounded-md" />`,
    pdf: `<input type="file" id="quizPDF" accept="application/pdf" class="w-full border p-2 rounded-md" />`
  };

  container.innerHTML = fields[type] || '';
});

// Global Quiz Variables
let quizFlashcards = [];
let quizIndex = 0;
let correctCount = 0;
let wrongCount = 0;

async function startQuizFromInput() {
  const type = document.getElementById("quizInputType").value;
  const flashcardTextInput = async () => document.getElementById("quizText").value.trim();

  const flashcardAudioInput = async () => {
    const file = document.getElementById("quizAudio").files[0];
    const formData = new FormData();
    formData.append('audio', file);
    const res = await fetch('/transcribe_audio', { method: 'POST', body: formData });
    const data = await res.json();
    return data.transcript || '';
  };

  const flashcardImageInput = async () => {
    const file = document.getElementById("quizImage").files[0];
    const { data: { text } } = await Tesseract.recognize(file, 'eng');
    return text;
  };

  const flashcardPDFInput = async () => {
    const file = document.getElementById("quizPDF").files[0];
    const reader = new FileReader();
    return await new Promise(resolve => {
      reader.onload = async function () {
        const typedArray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let text = '';
        for (let i = 1; i <= Math.min(10, pdf.numPages); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + '\n';
        }
        resolve(text);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  let rawText = '';
  try {
    if (type === 'text') rawText = await flashcardTextInput();
    if (type === 'audio') rawText = await flashcardAudioInput();
    if (type === 'image') rawText = await flashcardImageInput();
    if (type === 'pdf') rawText = await flashcardPDFInput();
  } catch (err) {
    alert("Failed to extract text. Try again.");
    return;
  }

  if (!rawText.trim()) {
    alert("Input is empty or invalid.");
    return;
  }

  // Generate flashcards from extracted text
  const res = await fetch('/generate_flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: rawText })
  });
  const result = await res.json();
  if (result.status !== 'success' || result.flashcards.length === 0) {
    alert("Could not generate flashcards. Try with better input.");
    return;
  }

  quizFlashcards = result.flashcards;
  quizIndex = 0;
  correctCount = 0;
  wrongCount = 0;
  showNextQuizCard();
  document.getElementById("quizModal").classList.remove("hidden");
}

// ... (all your functions up to showNextQuizCard stay the same)

function showNextQuizCard() {
  if (quizIndex >= quizFlashcards.length) {
    const suggestions = wrongCount > 0
      ? `🧐 Focus on reviewing the topics you missed. Try rephrasing your answers to check understanding.`
      : `🎉 Excellent work! You answered everything correctly.`;

    document.getElementById("quizModal").innerHTML = `
      <div class="bg-white rounded-xl p-6 max-w-xl w-full text-center">
        <h2 class="text-2xl font-bold text-green-700 mb-4">📊 Quiz Completed</h2>
        <p class="text-lg text-gray-800 mb-2">✅ Correct: ${correctCount}</p>
        <p class="text-lg text-gray-800 mb-4">❌ Incorrect: ${wrongCount}</p>
        <p class="text-gray-600 mb-4">${suggestions}</p>
        
        <div class="flex justify-center gap-4">
          <button onclick="generateQuizReport()" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
            📄 Download Report
          </button>
          <button onclick="closeQuiz()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Close
          </button>
        </div>
      </div>`;
    return;
  }

  const card = quizFlashcards[quizIndex];
  document.getElementById("quizQuestion").textContent = card.question;
  // document.getElementById("quizProgress").textContent = `Question ${quizIndex + 1} of ${quizFlashcards.length}`;
  document.getElementById("userAnswer").value = '';

  updateQuizProgress(quizIndex + 1, quizFlashcards.length);

}

async function submitQuizAnswer() {
  const userAnswer = document.getElementById("userAnswer").value.trim();
  const correctAnswer = quizFlashcards[quizIndex].answer;

  // Evaluate via backend
  const res = await fetch('/evaluate_answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_answer: userAnswer, correct_answer: correctAnswer })
  });

  const result = await res.json();

  // Save for report
  quizFlashcards[quizIndex].userAnswer = userAnswer;
  quizFlashcards[quizIndex].isCorrect = !!result.correct;

  if (result.correct) {
  correctCount++;
  showFeedback(true);
} else {
  wrongCount++;
  showFeedback(false, correctAnswer);
}


  quizIndex++;
  showNextQuizCard();
}

function closeQuiz() {
  document.getElementById("quizModal").classList.add("hidden");
}

// ✅ NEW FUNCTION: Generate Quiz Report
function generateQuizReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(40, 80, 160);
  doc.text("QuizCraft - Quiz Report", 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);

  let y = 30;
  doc.text(`📅 Date: ${new Date().toLocaleString()}`, 14, y);
  y += 8;
  doc.text(`✅ Correct: ${correctCount}`, 14, y);
  y += 6;
  doc.text(`❌ Incorrect: ${wrongCount}`, 14, y);
  y += 10;

  quizFlashcards.forEach((card, index) => {
    const userAnswer = card.userAnswer || '';
    const isCorrect = card.isCorrect ? '✅ Correct' : '❌ Incorrect';
    const qText = `Q${index + 1}: ${card.question}`;
    const uaText = `Your Answer: ${userAnswer}`;
    const caText = `Correct Answer: ${card.answer}`;
    const resultText = `Result: ${isCorrect}`;

    const lines = doc.splitTextToSize(
      [qText, uaText, caText, resultText].join('\n'),
      180
    );
    doc.text(lines, 14, y);
    y += lines.length * 6 + 4;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save("QuizCraft_Quiz_Report.pdf");
}
async function register() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  const res = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const result = await res.json();
  alert(result.message);
}

async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const result = await res.json();

  if (result.status === 'success') {
    alert("✅ Login successful!");
    location.reload();
  } else {
    alert("❌ " + result.message);
  }
}

// Add this function at the end of script.js
function showLoginRequiredPopup() {
  const popup = document.getElementById('loginRequiredPopup');
  if (!popup) return;
  popup.classList.remove('hidden');
  setTimeout(() => {
    popup.classList.add('hidden');
  }, 3000);
}


function toggleProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  dropdown.classList.toggle('hidden');
}

// Close dropdown on click outside
document.addEventListener('click', function (e) {
  const button = e.target.closest('[onclick="toggleProfileDropdown()"]');
  const dropdown = document.getElementById('profileDropdown');
  if (!button && dropdown && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});


function updateQuizProgress(current, total) {
  document.getElementById("quizProgress").textContent = `Question ${current} of ${total}`;
  const percentage = (current / total) * 100;
  document.getElementById("quizProgressBar").style.width = `${percentage}%`;
}

function showFeedback(correct, correctAnswer = "") {
  const feedback = document.getElementById("quizFeedback");
  feedback.classList.remove("hidden");

  if (correct) {
    feedback.textContent = "✅ Correct!";
    feedback.className = "bg-green-500 text-white text-center py-2 rounded-lg font-semibold mb-4 transition-all duration-300";
  } else {
    feedback.textContent = `❌ Incorrect. Correct: ${correctAnswer}`;
    feedback.className = "bg-red-500 text-white text-center py-2 rounded-lg font-semibold mb-4 transition-all duration-300";
  }

  setTimeout(() => {
    feedback.classList.add("hidden");
  }, 2000);
}
