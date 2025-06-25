from flask import Flask, request, render_template, jsonify
import google.generativeai as genai
import re
from faster_whisper import WhisperModel
import tempfile
import os

# === Setup ===
app = Flask(__name__)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

flashcard_cache = {}

# === Routes ===

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate_flashcards', methods=['POST'])
def generate_flashcards():
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        if not text:
            return jsonify({'status': 'error', 'message': 'Please enter study notes.', 'flashcards': []}), 400

        if text in flashcard_cache:
            return jsonify({'status': 'success', 'flashcards': flashcard_cache[text]})

        prompt = (
            "Generate informative flashcards from this content.\n"
            "Format each flashcard as:\n"
            "Question: <question>\nAnswer: <answer>\n"
            "No other output.\n\n"
            f"Content:\n{text}"
        )

        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        output = response.text.strip()

        matches = re.findall(r'Question[:>]\s*(.+?)\s*Answer[:>]\s*(.+?)(?=\n|$)', output, flags=re.IGNORECASE | re.DOTALL)

        flashcards = []
        for q, a in matches:
            q, a = q.strip(), a.strip()
            if len(q) > 5 and len(a) > 5:
                flashcards.append({'id': len(flashcards) + 1, 'question': q, 'answer': a})

        if not flashcards:
            return jsonify({'status': 'error', 'message': 'No flashcards found. Try different input.', 'flashcards': []}), 400

        flashcard_cache[text] = flashcards
        return jsonify({'status': 'success', 'flashcards': flashcards})

    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Something went wrong: {e}', 'flashcards': []}), 500

@app.route('/transcribe_audio', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        return jsonify({'status': 'error', 'message': 'No audio uploaded'}), 400

    audio_file = request.files['audio']
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        audio_file.save(tmp.name)
        whisper_model = WhisperModel("base", compute_type="int8")
        segments, _ = whisper_model.transcribe(tmp.name)
        transcript = ' '.join([seg.text for seg in segments])

    if not transcript.strip():
        return jsonify({'status': 'error', 'message': 'Could not transcribe audio'}), 400

    return jsonify({'status': 'success', 'transcript': transcript})

# No backend OCR here because we're using Tesseract.js on frontend.
@app.route('/evaluate_answer', methods=['POST'])
def evaluate_answer():
    data = request.get_json()
    user_answer = data.get('user_answer', '').strip()
    correct_answer = data.get('correct_answer', '').strip()

    if not user_answer or not correct_answer:
        return jsonify({'correct': False, 'reason': 'Empty input'}), 400

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            "You are a smart evaluator. Compare the user’s answer to the correct answer.\n"
            f"Correct Answer: {correct_answer}\n"
            f"User Answer: {user_answer}\n"
            "Is the user’s answer semantically correct? Reply only 'yes' or 'no'."
        )
        response = model.generate_content(prompt)
        result = response.text.strip().lower()
        return jsonify({'correct': 'yes' in result})
    except Exception as e:
        return jsonify({'correct': False, 'error': str(e)}), 500

# === Run Server ===
if __name__ == '__main__':
    app.run(debug=True)
