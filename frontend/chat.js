const API_URL = "http://127.0.0.1:5000/api/chat";

const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const languageSelect = document.getElementById("languageSelect");
const micButton = document.getElementById("micButton");
const voiceStatus = document.getElementById("voiceStatus");

function getTime() {
    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatResponse(text) {
    let html = escapeHtml(text);

    // Code blocks
    html = html.replace(
        /```([\s\S]*?)```/g,
        '<pre class="code-block"><code>$1</code></pre>'
    );

    // Headings
    html = html.replace(/^### (.*?)$/gm, "<h4>$1</h4>");
    html = html.replace(/^## (.*?)$/gm, "<h3>$1</h3>");
    html = html.replace(/^# (.*?)$/gm, "<h2>$1</h2>");

    // Bold
    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    // Inline code
    html = html.replace(
        /`([^`]+)`/g,
        '<code class="inline-code">$1</code>'
    );

    // Horizontal line
    html = html.replace(/^---$/gm, "<hr>");

    // Numbered points
    html = html.replace(
        /^\s*(\d+)\.\s+(.*?)$/gm,
        '<div class="number-point"><span>$1.</span> $2</div>'
    );

    // Bullet points
    html = html.replace(
        /^\s*[-*]\s+(.*?)$/gm,
        '<div class="bullet-point"><span>•</span> $1</div>'
    );

    const lines = html.split("\n");
    const output = [];

    for (let line of lines) {
        line = line.trim();

        if (line === "") {
            output.push('<div class="answer-space"></div>');
            continue;
        }

        if (
            line.startsWith("<h2") ||
            line.startsWith("<h3") ||
            line.startsWith("<h4") ||
            line.startsWith("<div") ||
            line.startsWith("<pre") ||
            line.startsWith("<hr")
        ) {
            output.push(line);
        } else {
            output.push(
                `<p class="answer-line">${line}</p>`
            );
        }
    }

    return output.join("");
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addUserMessage(message) {
    const div = document.createElement("div");
    div.className = "message user";

    div.innerHTML = `
        <div class="avatar">USER</div>
        <div class="bubble">
            <p>${escapeHtml(message)}</p>
            <small>${getTime()}</small>
        </div>
    `;

    chatBox.appendChild(div);
    scrollToBottom();
}

function addBotMessage(data) {
    const div = document.createElement("div");
    div.className = "message bot";

    let stressHTML = "";

    if (data.stress_level && data.tips) {
        const stressLabel = data.stress_level
            .replaceAll("_", " ")
            .toUpperCase();

        const tips = data.tips
            .map(tip => `<li>${escapeHtml(tip)}</li>`)
            .join("");

        stressHTML = `
            <div class="stress-card">
                <strong>
                    Stress Level: ${escapeHtml(stressLabel)}
                </strong>

                <ul class="tip-list">
                    ${tips}
                </ul>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="avatar">AI</div>

        <div class="bubble">

            <div class="ai-response">
                ${formatResponse(
                    data.response || "No response received."
                )}
            </div>

            ${stressHTML}

            <small>${getTime()}</small>

        </div>
    `;

    chatBox.appendChild(div);
    scrollToBottom();
}

function addTypingMessage() {
    const div = document.createElement("div");

    div.className = "message bot";
    div.id = "typingMessage";

    div.innerHTML = `
        <div class="avatar">AI</div>

        <div class="bubble">
            <p>ExamEase is thinking...</p>
        </div>
    `;

    chatBox.appendChild(div);
    scrollToBottom();
}

function removeTypingMessage() {
    const typingMessage =
        document.getElementById("typingMessage");

    if (typingMessage) {
        typingMessage.remove();
    }
}

function addErrorMessage(error) {
    const div = document.createElement("div");

    div.className = "message bot";

    div.innerHTML = `
        <div class="avatar">AI</div>

        <div class="bubble">
            <p>
                Connection error:
                ${escapeHtml(error)}
            </p>

            <small>${getTime()}</small>
        </div>
    `;

    chatBox.appendChild(div);
    scrollToBottom();
}


/* =========================
   VOICE INPUT
========================= */

function startVoiceInput() {
    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        voiceStatus.textContent =
            "❌ Voice input is not supported in this browser.";
        return;
    }

    const recognition = new SpeechRecognition();

    if (languageSelect.value === "Kannada") {
        recognition.lang = "kn-IN";
    } else {
        recognition.lang = "en-IN";
    }

    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceStatus.textContent =
        "🎤 Listening... Speak now.";

    micButton.disabled = true;

    recognition.start();

    recognition.onresult = function(event) {
        const transcript =
            event.results[0][0].transcript;

        messageInput.value = transcript;

        voiceStatus.textContent =
            "✅ Voice captured. Click ➤ to send.";

        messageInput.focus();
    };

    recognition.onerror = function(event) {
        voiceStatus.textContent =
            "❌ Voice error: " + event.error;

        micButton.disabled = false;
    };

    recognition.onend = function() {
        micButton.disabled = false;
    };
}


/* =========================
   SEND MESSAGE
========================= */

async function sendMessage() {
    const message =
        messageInput.value.trim();

    if (!message) {
        return;
    }

    const language =
        languageSelect.value;

    addUserMessage(message);

    messageInput.value = "";

    sendButton.disabled = true;
    messageInput.disabled = true;

    addTypingMessage();

    try {
        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message,
                language: language
            })
        });

        const data = await response.json();

        removeTypingMessage();

        if (!response.ok) {
            throw new Error(
                data.error || "Server error"
            );
        }

        addBotMessage(data);

    } catch (error) {

        console.error(
            "ExamEase Error:",
            error
        );

        removeTypingMessage();

        addErrorMessage(
            error.message
        );

    } finally {

        sendButton.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}


/* =========================
   QUICK SUGGESTIONS
========================= */

function sendSuggestion(message) {
    messageInput.value = message;
    sendMessage();
}


/* =========================
   CLEAR CHAT
========================= */

function clearChat() {
    chatBox.innerHTML = `
        <div class="message bot">

            <div class="avatar">AI</div>

            <div class="bubble">

                <p>
                    Hi! I'm
                    <strong>ExamEase</strong>,
                    your AI student assistant.
                </p>

                <p>
                    Ask me anything about studies,
                    coding, exams, projects,
                    or general questions.
                </p>

                <small>${getTime()}</small>

            </div>

        </div>
    `;

    messageInput.focus();
}


/* =========================
   ENTER KEY
========================= */

messageInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();
        }
    }
);
// =========================
// AI STUDY PLANNER
// =========================

function openStudyPlanner() {
    const modal = document.getElementById("plannerModal");

    if (modal) {
        modal.style.display = "flex";
    }
}


function closeStudyPlanner() {
    const modal = document.getElementById("plannerModal");

    if (modal) {
        modal.style.display = "none";
    }
}


async function generateStudyPlan() {

    const subject =
        document.getElementById("plannerSubject").value.trim();

    const topics =
        document.getElementById("plannerTopics").value.trim();

    const days =
        document.getElementById("plannerDays").value;

    const hours =
        document.getElementById("plannerHours").value;

    const result =
        document.getElementById("plannerResult");


    // Validate input
    if (!subject || !topics || !days || !hours) {

        result.innerHTML = `
            <div class="planner-error">
                ⚠️ Please fill in all the fields.
            </div>
        `;

        return;
    }


    result.innerHTML = `
        <div class="planner-loading">
            🤖 ExamEase is creating your study plan...
        </div>
    `;


    const prompt = `
Create a practical study plan for an engineering student.

Subject: ${subject}

Topics:
${topics}

Number of days available: ${days}

Study hours per day: ${hours}

Create a day-by-day study plan.

For each day include:
1. Topics to study
2. Approximate study time
3. Practice/revision activity

Also include:
- Important topics to prioritize
- Final revision strategy
- Exam-day tips

Keep the plan simple, realistic and easy to follow.
`;


    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: prompt,
                language: languageSelect.value
            })

        });


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error || "Unable to generate study plan."
            );

        }


        result.innerHTML = `
            <div class="planner-success">

                <h3>📚 Your Study Plan</h3>

                <div class="planner-answer">
                    ${formatResponse(data.response)}
                </div>

            </div>
        `;

    } catch (error) {

        console.error(
            "Study Planner Error:",
            error
        );

        result.innerHTML = `
            <div class="planner-error">

                ❌ Unable to generate the study plan.

                <br><br>

                ${escapeHtml(error.message)}

            </div>
        `;
    }
}


// Close planner when clicking outside the box

window.addEventListener("click", function(event) {

    const modal =
        document.getElementById("plannerModal");

    if (event.target === modal) {

        closeStudyPlanner();

    }

});
// =========================
// AI QUIZ GENERATOR
// =========================

function openQuizGenerator() {
    const modal = document.getElementById("quizModal");

    if (modal) {
        modal.style.display = "flex";
    }
}

function closeQuizGenerator() {
    const modal = document.getElementById("quizModal");

    if (modal) {
        modal.style.display = "none";
    }
}

async function generateQuiz() {
    const subject =
        document.getElementById("quizSubject").value.trim();

    const topic =
        document.getElementById("quizTopic").value.trim();

    const count =
        document.getElementById("quizCount").value;

    const result =
        document.getElementById("quizResult");

    if (!subject || !topic || !count) {
        result.innerHTML = `
            <div class="quiz-error">
                ⚠️ Please fill in all the fields.
            </div>
        `;
        return;
    }

    result.innerHTML = `
        <div class="quiz-loading">
            🤖 ExamEase is generating your quiz...
        </div>
    `;

    const prompt = `
Create a multiple-choice quiz for an engineering student.

Subject: ${subject}

Topic: ${topic}

Number of questions: ${count}

For every question provide:
- Question
- 4 options
- Correct answer
- Short explanation

Make the questions useful for exam preparation.

Use this exact format:

QUESTION 1:
Question text

A) Option 1
B) Option 2
C) Option 3
D) Option 4

ANSWER: A
EXPLANATION: Short explanation

QUESTION 2:
Question text

A) Option 1
B) Option 2
C) Option 3
D) Option 4

ANSWER: B
EXPLANATION: Short explanation

Continue until ${count} questions are completed.

Do not add unnecessary text before or after the quiz.
`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: prompt,
                language: languageSelect.value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to generate quiz."
            );
        }

        result.innerHTML = `
            <div class="quiz-success">

                <h3>📝 Your AI Quiz</h3>

                <div class="quiz-answer">
                    ${formatResponse(data.response)}
                </div>

            </div>
        `;

    } catch (error) {

        console.error("Quiz Generator Error:", error);

        result.innerHTML = `
            <div class="quiz-error">
                ❌ Unable to generate the quiz.
                <br><br>
                ${escapeHtml(error.message)}
            </div>
        `;
    }
}


// Close quiz when clicking outside the box
window.addEventListener("click", function(event) {

    const modal = document.getElementById("quizModal");

    if (event.target === modal) {
        closeQuizGenerator();
    }

});