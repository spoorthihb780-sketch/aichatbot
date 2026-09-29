from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)


# =========================
# LOAD MODEL
# =========================

try:
    model = joblib.load("model.pkl")
except Exception:
    model = None


# =========================
# GEMINI
# =========================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(
    api_key=GEMINI_API_KEY
)


# =========================
# CONVERSATION MEMORY
# =========================

conversation_history = []


# =========================
# STRESS KEYWORDS
# =========================

stress_keywords = [
    "stress",
    "stressed",
    "stressful",
    "anxiety",
    "anxious",
    "panic",
    "panicking",
    "worried",
    "worry",
    "pressure",
    "overwhelmed",
    "nervous",
    "exam fear",
    "fear of exam",
    "can't focus",
    "cannot focus",
    "feeling nervous",
    "nervous about exam",
    "scared about exam",
    "afraid of exam"
]


# =========================
# STRESS SUPPORT
# =========================

def generate_stress_support(stress_level):

    if stress_level == "high":

        return [
            "Take 5 slow breaths.",
            "Break your study work into small tasks.",
            "Focus only on the next topic.",
            "Take a short 5–10 minute break.",
            "Talk to someone you trust if you feel overwhelmed."
        ]

    elif stress_level == "medium":

        return [
            "Take a few slow breaths.",
            "Choose one small topic to study first.",
            "Use short study sessions with breaks.",
            "Keep your phone away while studying."
        ]

    else:

        return [
            "Keep following your study plan.",
            "Take regular short breaks.",
            "Stay hydrated and get enough sleep."
        ]


# =========================
# AI RESPONSE
# =========================

def ask_ai(message, language):

    if language == "Kannada":

        language_instruction = """
Respond in Kannada.

Use simple Kannada that an engineering student can understand.

Technical words such as DBMS, Python, API, HTML, CSS,
JavaScript, AI and machine learning can remain in English.

Do not translate programming code.
Keep programming code exactly as code.
"""

    else:

        language_instruction = """
Respond in simple and clear English suitable for an engineering student.
"""


    system_prompt = f"""
You are ExamEase, an AI student assistant.

You help engineering students with:

- Engineering subjects
- Programming and coding
- DBMS
- Data structures
- Operating systems
- Computer networks
- AI and machine learning
- Mathematics
- Exam preparation
- Study planning
- Projects and assignments
- General questions
- Exam stress support

{language_instruction}

Rules:

1. Give accurate and useful answers.
2. Explain difficult topics in simple words.
3. Use headings when useful.
4. Use numbered points for steps.
5. Use bullet points for lists.
6. Put programming code inside code blocks.
7. Do not give unnecessarily long answers.
8. If the user asks for code, provide working code.
9. If the user asks an academic question, explain clearly.
10. If the user is stressed, respond calmly and supportively.
"""


    conversation_text = ""

    for item in conversation_history[-10:]:

        conversation_text += (
            item["role"].upper()
            + ": "
            + item["content"]
            + "\n"
        )


    prompt = f"""
{system_prompt}

Previous conversation:
{conversation_text}

Current student question:
{message}
"""


    # =========================
    # GEMINI RETRY SYSTEM
    # =========================

    answer = None

    for attempt in range(3):

        try:

            print(
                f"Gemini request attempt {attempt + 1}/3"
            )

            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt
            )

            answer = response.text

            print("Gemini response received.")

            break

        except Exception as e:

            print(
                f"Gemini attempt {attempt + 1} failed:",
                str(e)
            )

            if attempt == 2:
                raise e

            print("Retrying in 3 seconds...")

            time.sleep(3)


    conversation_history.append({
        "role": "user",
        "content": message
    })


    conversation_history.append({
        "role": "assistant",
        "content": answer
    })


    return answer


# =========================
# HOME
# =========================

@app.route("/")
def home():

    return jsonify({
        "message": "ExamEase AI Backend is running!",
        "status": "success"
    })


# =========================
# CHAT API
# =========================

@app.route("/api/chat", methods=["POST"])
def chat():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "error": "No data received"
            }), 400


        message = data.get(
            "message",
            ""
        ).strip()


        language = data.get(
            "language",
            "English"
        )


        if not message:

            return jsonify({
                "error": "Message cannot be empty"
            }), 400


        if language not in [
            "English",
            "Kannada"
        ]:

            language = "English"


        # Generate AI response
        answer = ask_ai(
            message,
            language
        )


        # =========================
        # STRESS DETECTION
        # =========================

        message_lower = message.lower()


        is_stress_question = any(
            keyword in message_lower
            for keyword in stress_keywords
        )


        # Normal question
        if not is_stress_question:

            return jsonify({

                "user_message": message,

                "language": language,

                "response": answer

            })


        # Stress question
        stress_level = "medium"


        if any(
            word in message_lower
            for word in [
                "panic",
                "panicking",
                "overwhelmed",
                "can't cope",
                "cannot cope"
            ]
        ):

            stress_level = "high"


        tips = generate_stress_support(
            stress_level
        )


        return jsonify({

            "user_message": message,

            "language": language,

            "response": answer,

            "stress_level": stress_level,

            "tips": tips

        })


    except Exception as e:

        print("ERROR:", str(e))

        return jsonify({

            "error":
            "AI service error: " + str(e)

        }), 500


# =========================
# RUN SERVER
# =========================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False
    )