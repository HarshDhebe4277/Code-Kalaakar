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
        card.className = "bg-gradient-to-br from-blue-100 to-purple-100 p-4 rounded-lg shadow hover:shadow-md transition";

        card.innerHTML = `
          <h3 class="font-bold text-gray-700 mb-2">Question ${flashcard.id}</h3>
          <p class="text-lg font-semibold text-gray-800">${flashcard.question}</p>
          <button onclick="toggleAnswer(this)" class="mt-4 text-sm text-blue-600">👁 Show Answer</button>
          <p class="hidden text-gray-700 mt-2">${flashcard.answer}</p>
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

async function exportFlashcardsToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const flashcards = Array.from(document.querySelectorAll("#flashcards > div"));
  const userText = document.getElementById("inputText").value.trim();

  if (flashcards.length === 0 || !userText) {
    alert("Nothing to export. Please generate flashcards first.");
    return;
  }

  // Title
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.setFont("helvetica", "bold");
  doc.text("QuizCraft Flashcard Summary", 105, 15, { align: "center" });

  // User Query
  doc.setFontSize(12);
  doc.setTextColor(50);
  doc.setFont("helvetica", "bold");
  doc.text("User Query:", 14, 30);

  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(userText, 180);
  doc.text(lines, 14, 37);

  const yAfterQuery = 37 + lines.length * 6;

  // Flashcards
  const tableData = flashcards.map((card, index) => {
    const question = card.querySelectorAll("p")[0]?.innerText || "";
    const answer = card.querySelectorAll("p")[1]?.innerText || "";
    return [`Q${index + 1}: ${question}`, `A${index + 1}: ${answer}`];
  });

  doc.autoTable({
    startY: yAfterQuery + 10,
    head: [['Question', 'Answer']],
    body: tableData,
    styles: {
      fontSize: 11,
      cellPadding: 4,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      halign: "center"
    },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 85 }
    },
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
  const flashcards = Array.from(document.querySelectorAll("#flashcards > div"));
  const userText = document.getElementById("inputText").value.trim();

  if (flashcards.length === 0 || !userText) {
    alert("Nothing to export. Please generate flashcards first.");
    return;
  }

  let csv = "User Query,\n\"" + userText.replace(/"/g, '""') + "\"\n\n";
  csv += "Question,Answer\n";

  flashcards.forEach((card, index) => {
    const question = card.querySelectorAll("p")[0]?.innerText || "";
    const answer = card.querySelectorAll("p")[1]?.innerText || "";
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
