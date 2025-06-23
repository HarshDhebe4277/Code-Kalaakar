from flask import Flask, request, render_template, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')  # Make sure templates/index.html exists

@app.route('/generate_flashcards', methods=['POST'])
def generate_flashcards():
    data = request.get_json() or {}
    text = data.get('text', '')

    # TODO: Replace with AI-generated flashcards using T5/Gemini
    flashcards = [
        {'question': 'What is the main topic?', 'answer': 'A sample answer'},
        {'question': 'What is a key concept?', 'answer': 'Another sample answer'},
        {'question': 'What is an example?', 'answer': 'Yet another answer'}
    ]
    return jsonify({'flashcards': flashcards})

if __name__ == '__main__':
    app.run(debug=True)
