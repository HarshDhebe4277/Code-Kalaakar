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
    alert("Please enter study notes.");
    container.innerHTML = '';
    return;
  }

  try {
    const res = await fetch('/generate_flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const result = await res.json();
    container.innerHTML = '';

    if (result.status === 'success') {
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
      container.innerHTML = `<p class="text-red-600">${result.message || 'Could not generate flashcards. Try different notes.'}</p>`;
    }
  } catch (error) {
    container.innerHTML = `<p class="text-red-600">⚠️ Network or server error. Please try again.</p>`;
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