from flask import Flask, request, render_template, jsonify, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import or_
from dotenv import load_dotenv
import google.generativeai as genai
from faster_whisper import WhisperModel
import tempfile
import os
import re

# === Load Environment Variables ===
load_dotenv()

# === Flask Setup ===
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "default-secret")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# === Extensions ===
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# === Flashcard Cache (in-memory) ===
flashcard_cache = {}

# === Models ===
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

# === Routes ===

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', username=session.get('username'))

# ---------- AUTH ROUTES ----------

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username'].strip()
        email = request.form['email'].strip().lower()
        password = request.form['password']
        confirm_password = request.form['confirm_password']

        if password != confirm_password:
            return render_template('signup.html', error='Passwords do not match.')

        existing_user = User.query.filter(or_(User.username == username, User.email == email)).first()
        if existing_user:
            return render_template('signup.html', error='Username or Email already exists.')

        hashed_pw = generate_password_hash(password)
        new_user = User(username=username, email=email, password=hashed_pw)
        db.session.add(new_user)
        db.session.commit()

        return redirect(url_for('login'))
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        identifier = request.form['identifier'].strip().lower()
        password = request.form['password']

        user = User.query.filter(or_(User.email == identifier, User.username == identifier)).first()
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['username'] = user.username
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='Invalid credentials.')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ---------- FLASHCARD GENERATION ----------

@app.route('/generate_flashcards', methods=['POST'])
def generate_flashcards():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Please log in first.'}), 401

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

        matches = re.findall(r'Question[:>]\\s*(.+?)\\s*Answer[:>]\\s*(.+?)(?=\\n|$)', output, flags=re.IGNORECASE | re.DOTALL)

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

# ---------- AUDIO TRANSCRIPTION ----------

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

# ---------- QUIZ EVALUATOR ----------

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

# ---------- DB INIT ----------

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)