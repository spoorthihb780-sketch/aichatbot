const API_URL = "http://127.0.0.1:5000/api/chat";

const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

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

    // Stress card appears ONLY when backend sends
    // stress_level and tips.
    if (data.stress_level && data.tips) {

        const stressLabel = data.stress_level
            .replaceAll("_", " ")
            .toUpperCase();

        const tips = data.tips
            .map(tip => `<li>${escapeHtml(tip)}</li>`)
            .join("");

        stressHTML = `
            <div class="stress-card">
                <strong>Stress Level: ${escapeHtml(stressLabel)}</strong>

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
                ${escapeHtml(data.response || "No response received.")}
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

async function sendMessage() {

    const message =
        messageInput.value.trim();

    if (!message) {
        return;
    }

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
                message: message
            })
        });

        const data =
            await response.json();

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

function sendSuggestion(message) {

    messageInput.value = message;

    sendMessage();
}

function clearChat() {

    chatBox.innerHTML = `
        <div class="message bot">

            <div class="avatar">AI</div>

            <div class="bubble">

                <p>
                    Hi! I'm <strong>ExamEase</strong>,
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

messageInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();
        }
    }
);