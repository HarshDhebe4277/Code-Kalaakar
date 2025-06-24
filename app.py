from flask import Flask, request, render_template, jsonify
import google.generativeai as genai
import re

app = Flask(__name__)
genai.configure(api_key="")  # replace with your real API key

flashcard_cache = {}

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
        return jsonify({'status': 'error', 'message': 'Something went wrong.', 'flashcards': []}), 500

if __name__ == '__main__':
    app.run(debug=True)
