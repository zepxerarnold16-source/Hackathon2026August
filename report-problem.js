// ============================================================
// CHRONICAI — REPORT PROBLEM
// CONVERSATIONAL AI + IMAGE + LOCATION + REPORT GENERATION
// + CITIZEN VERIFICATION + SUBMIT
// ============================================================

"use strict";

// ============================================================
// FIREBASE
// ============================================================

import {
    onAuthStateChanged
} from "firebase/auth";

import {
    ref,
    get,
    update
} from "firebase/database";

import {
    auth,
    database
} from "./firebase.js";


// ============================================================
// API CONFIG
// ============================================================

const API_BASE = "";


// ============================================================
// DOM ELEMENTS
// ============================================================

const reportForm =
    document.getElementById("reportForm");

const descriptionInput =
    document.getElementById("description");

const locationInput =
    document.getElementById("location");

const imageInput =
    document.getElementById("image");

const imagePreview =
    document.getElementById("imagePreview");

const analyzeButton =
    document.getElementById("analyzeButton");

const submitButton =
    document.getElementById("submitReportButton");

const messageBox =
    document.getElementById("reportMessage");

const aiResult =
    document.getElementById("aiResult");

const verificationSection =
    document.getElementById("citizenVerification");

const verificationCheckbox =
    document.getElementById("verifyReport");

const resetButton =
    document.getElementById("resetReportButton");

const reanalyzeButton =
    document.getElementById("reanalyzeButton");


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let currentAnalysis = null;

let selectedImageData = null;

let isAnalyzing = false;

let isSubmitting = false;

let conversation = [];

let reportReady = false;


// ============================================================
// UTILITY — MESSAGE
// ============================================================

function showMessage(
    message,
    type = "error"
) {

    if (!messageBox) {
        console.log(message);
        return;
    }

    messageBox.textContent = message;

    messageBox.style.display = "block";

    if (type === "success") {

        messageBox.style.color =
            "#35e69a";

    } else if (type === "warning") {

        messageBox.style.color =
            "#ffd60a";

    } else {

        messageBox.style.color =
            "#ff6b6b";
    }
}


// ============================================================
// CLEAR MESSAGE
// ============================================================

function clearMessage() {

    if (!messageBox) {
        return;
    }

    messageBox.textContent = "";

    messageBox.style.display = "none";
}


// ============================================================
// BUTTON LOADING
// ============================================================

function setAnalyzeLoading(
    loading
) {

    if (!analyzeButton) {
        return;
    }

    analyzeButton.disabled =
        loading;

    if (loading) {

        analyzeButton.dataset.originalText =
            analyzeButton.innerHTML;

        analyzeButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            ChronicAI is thinking...
        `;

    } else {

        analyzeButton.innerHTML =
            analyzeButton.dataset.originalText ||
            `
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            Analyze with AI
            `;
    }
}


// ============================================================
// SUBMIT BUTTON LOADING
// ============================================================

function setSubmitLoading(
    loading
) {

    if (!submitButton) {
        return;
    }

    submitButton.disabled =
        loading;

    if (loading) {

        submitButton.dataset.originalText =
            submitButton.innerHTML;

        submitButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Submitting Report...
        `;

    } else {

        submitButton.innerHTML =
            submitButton.dataset.originalText ||
            `
            <i class="fa-solid fa-paper-plane"></i>
            Submit Report
            `;
    }
}


// ============================================================
// GET STORED USER
// ============================================================

function getStoredUser() {

    try {

        const stored =
            localStorage.getItem(
                "ChronicAIUser"
            );

        if (!stored) {
            return null;
        }

        return JSON.parse(
            stored
        );

    } catch (error) {

        console.warn(
            "Unable to read stored ChronicAI user:",
            error
        );

        return null;
    }
}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    async (user) => {

        currentUser =
            user || null;

        if (!user) {

            console.warn(
                "ChronicAI: No Firebase user currently logged in."
            );

            return;
        }

        console.log(
            "ChronicAI: Logged in citizen:",
            user.email
        );

        await loadCitizenProfile(
            user
        );
    }
);


// ============================================================
// LOAD CITIZEN PROFILE
// ============================================================

async function loadCitizenProfile(
    user
) {

    try {

        const userRef =
            ref(
                database,
                `users/${user.uid}`
            );

        const snapshot =
            await get(
                userRef
            );

        if (
            snapshot.exists()
        ) {

            const profile =
                snapshot.val();

            console.log(
                "ChronicAI citizen profile loaded:",
                profile
            );

            if (
                profile.name &&
                !localStorage.getItem(
                    "ChronicAIUserName"
                )
            ) {

                localStorage.setItem(
                    "ChronicAIUserName",
                    profile.name
                );
            }
        }

    } catch (error) {

        console.warn(
            "Unable to load citizen profile:",
            error
        );
    }
}


// ============================================================
// GET CITIZEN NAME
// ============================================================

function getCitizenName() {

    if (
        currentUser?.displayName
    ) {

        return currentUser.displayName;
    }

    const stored =
        getStoredUser();

    if (
        stored?.name
    ) {

        return stored.name;
    }

    return (
        localStorage.getItem(
            "ChronicAIUserName"
        ) ||
        "Anonymous"
    );
}


// ============================================================
// GET CITIZEN EMAIL
// ============================================================

function getCitizenEmail() {

    if (
        currentUser?.email
    ) {

        return currentUser.email;
    }

    const stored =
        getStoredUser();

    if (
        stored?.email
    ) {

        return stored.email;
    }

    return (
        localStorage.getItem(
            "ChronicAIUserEmail"
        ) ||
        ""
    );
}


// ============================================================
// IMAGE VALIDATION
// ============================================================

function isValidImage(
    file
) {

    if (!file) {
        return false;
    }

    const allowedTypes = [

        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif"

    ];

    return allowedTypes.includes(
        file.type
    );
}


// ============================================================
// IMAGE TO DATA URL
// ============================================================

function imageToDataURL(
    file
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const reader =
                new FileReader();

            reader.onload = () => {

                resolve(
                    reader.result
                );
            };

            reader.onerror = () => {

                reject(
                    new Error(
                        "Unable to read image."
                    )
                );
            };

            reader.readAsDataURL(
                file
            );
        }
    );
}


// ============================================================
// IMAGE UPLOAD
// ============================================================

if (imageInput) {

    imageInput.addEventListener(
        "change",
        async () => {

            clearMessage();

            const file =
                imageInput.files?.[0];

            selectedImageData =
                null;

            if (!file) {

                if (imagePreview) {

                    imagePreview.style.display =
                        "none";

                    imagePreview.removeAttribute(
                        "src"
                    );
                }

                return;
            }


            // ------------------------------------------------
            // TYPE
            // ------------------------------------------------

            if (
                !isValidImage(
                    file
                )
            ) {

                showMessage(
                    "Please upload a JPG, PNG, WEBP or GIF image."
                );

                imageInput.value =
                    "";

                return;
            }


            // ------------------------------------------------
            // SIZE
            // ------------------------------------------------

            const maxSize =
                10 * 1024 * 1024;

            if (
                file.size >
                maxSize
            ) {

                showMessage(
                    "Image must be smaller than 10MB."
                );

                imageInput.value =
                    "";

                return;
            }


            try {

                selectedImageData =
                    await imageToDataURL(
                        file
                    );


                // ------------------------------------------------
                // PREVIEW
                // ------------------------------------------------

                if (
                    imagePreview
                ) {

                    imagePreview.src =
                        selectedImageData;

                    imagePreview.style.display =
                        "block";
                }


                showMessage(
                    "Image selected successfully. ChronicAI can now understand it.",
                    "success"
                );


            } catch (error) {

                console.error(
                    error
                );

                showMessage(
                    "Unable to process the selected image."
                );
            }

        }
    );
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        String(
            value ?? ""
        );

    return div.innerHTML;
}


// ============================================================
// NORMALIZE AI REPLY
// ============================================================

function getAIReply(
    data
) {

    if (!data) {
        return "";
    }


    // --------------------------------------------------------
    // NORMAL CONVERSATIONAL RESPONSE
    // --------------------------------------------------------

    if (
        typeof data.reply === "string"
    ) {

        return data.reply.trim();
    }


    if (
        typeof data.message === "string"
    ) {

        return data.message.trim();
    }


    if (
        typeof data.response === "string"
    ) {

        return data.response.trim();
    }


    // --------------------------------------------------------
    // NESTED RESPONSE
    // --------------------------------------------------------

    if (
        data.data &&
        typeof data.data.reply === "string"
    ) {

        return data.data.reply.trim();
    }


    if (
        data.analysis &&
        typeof data.analysis.reply === "string"
    ) {

        return data.analysis.reply.trim();
    }


    // --------------------------------------------------------
    // OLD STRUCTURED API COMPATIBILITY
    // --------------------------------------------------------

    if (
        data.analysis &&
        typeof data.analysis.summary === "string"
    ) {

        return data.analysis.summary.trim();
    }


    return "";
}


// ============================================================
// DISPLAY NORMAL AI CHAT RESPONSE
// ============================================================

function displayAIReply(
    reply
) {

    if (!aiResult) {

        console.log(
            "ChronicAI:",
            reply
        );

        return;
    }


    const safeReply =
        escapeHTML(
            reply
        );


    aiResult.innerHTML = `

        <div class="ai-result-card ChronicAI-chat-response">

            <div class="ai-result-header">

                <div>

                    <span class="ai-badge">

                        <i class="fa-solid fa-robot"></i>

                        ChronicAI

                    </span>

                    <h3>
                        AI Assistant
                    </h3>

                </div>

            </div>


            <div class="ai-result-section">

                <p class="ChronicAI-ai-message">
                    ${safeReply}
                </p>

            </div>

        </div>

    `;


    aiResult.style.display =
        "block";


    // --------------------------------------------------------
    // VERIFICATION
    // --------------------------------------------------------

    if (
        verificationSection &&
        reportReady
    ) {

        verificationSection.style.display =
            "block";
    }


    // --------------------------------------------------------
    // SUBMIT
    // --------------------------------------------------------

    if (
        submitButton &&
        reportReady
    ) {

        submitButton.style.display =
            "inline-flex";

        submitButton.disabled =
            false;
    }
}


// ============================================================
// DISPLAY CONVERSATION
// ============================================================

function displayConversation() {

    if (!aiResult) {
        return;
    }

    if (!conversation.length) {
        aiResult.style.display = "none";
        return;
    }


    const html =
        conversation
            .map(
                item => {

                    if (
                        item.role === "user"
                    ) {

                        return `

                            <div class="ChronicAI-chat-message user-message">

                                <div class="chat-label">
                                    You
                                </div>

                                <div class="chat-content">
                                    ${escapeHTML(item.content)}
                                </div>

                            </div>

                        `;
                    }


                    return `

                        <div class="ChronicAI-chat-message ai-message">

                            <div class="chat-label">

                                <i class="fa-solid fa-robot"></i>

                                ChronicAI

                            </div>

                            <div class="chat-content">
                                ${escapeHTML(item.content)}
                            </div>

                        </div>

                    `;
                }
            )
            .join("");


    aiResult.innerHTML = `

        <div class="ai-result-card ChronicAI-conversation">

            ${html}

        </div>

    `;


    aiResult.style.display =
        "block";


    // --------------------------------------------------------
    // SCROLL
    // --------------------------------------------------------

    setTimeout(
        () => {

            aiResult.scrollTop =
                aiResult.scrollHeight;

        },
        50
    );
}


// ============================================================
// ADD CONVERSATION MESSAGE
// ============================================================

function addConversationMessage(
    role,
    content
) {

    if (!content) {
        return;
    }

    conversation.push({

        role,

        content,

        timestamp:
            new Date().toISOString()

    });

    displayConversation();
}


// ============================================================
// ANALYZE REPORT / CHAT WITH AI
// ============================================================

async function analyzeReport() {

    if (isAnalyzing) {
        return;
    }

    clearMessage();


    // ========================================================
    // INPUT
    // ========================================================

    const description =
        descriptionInput?.value
            ?.trim() ||
        "";

    const location =
        locationInput?.value
            ?.trim() ||
        "";


    // ========================================================
    // VALIDATION
    // ========================================================

    if (
        !description &&
        !selectedImageData
    ) {

        showMessage(
            "Please describe the civic problem or upload an image."
        );

        descriptionInput?.focus();

        return;
    }


    if (!location) {

        showMessage(
            "Please enter the problem location."
        );

        locationInput?.focus();

        return;
    }


    // ========================================================
    // START
    // ========================================================

    isAnalyzing =
        true;

    setAnalyzeLoading(
        true
    );


    showMessage(
        "ChronicAI is understanding your problem...",
        "warning"
    );


    try {

        // ====================================================
        // USER MESSAGE
        // ====================================================

        const userMessage =
            description ||
            "Please analyze the uploaded civic problem image.";


        addConversationMessage(
            "user",
            userMessage
        );


        // ====================================================
        // API REQUEST
        // ====================================================

        const response =
            await fetch(
                `${API_BASE}/api/analyze`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            message:
                                userMessage,

                            description,

                            location,

                            reporterName:
                                getCitizenName(),

                            reporterEmail:
                                getCitizenEmail(),

                            image:
                                selectedImageData ||
                                null,

                            conversation

                        })

                }
            );


        // ====================================================
        // RESPONSE
        // ====================================================

        let data;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                "Server returned an invalid response."
            );
        }


        // ====================================================
        // API ERROR
        // ====================================================

        if (
            !response.ok ||
            data.success === false
        ) {

            throw new Error(
                data?.error ||
                data?.message ||
                `ChronicAI server returned ${response.status}.`
            );
        }


        // ====================================================
        // GET AI REPLY
        // ====================================================

        const reply =
            getAIReply(
                data
            );


        if (!reply) {

            throw new Error(
                "ChronicAI did not return a valid reply."
            );
        }


        // ====================================================
        // SAVE AI REPLY
        // ====================================================

        addConversationMessage(
            "assistant",
            reply
        );


        // ====================================================
        // OPTIONAL STRUCTURED ANALYSIS
        // ====================================================

        if (
            data.analysis &&
            typeof data.analysis === "object"
        ) {

            currentAnalysis =
                data.analysis;

        } else {

            currentAnalysis =
                null;
        }


        // ====================================================
        // DETECT REPORT READY
        // ====================================================

        reportReady =
            Boolean(
                data.reportReady ||
                data.readyToSubmit ||
                data.analysis?.reportReady ||
                data.analysis?.officialComplaint
            );


        // ====================================================
        // DISPLAY
        // ====================================================

        displayConversation();


        if (
            reportReady
        ) {

            if (
                verificationSection
            ) {

                verificationSection.style.display =
                    "block";
            }

            if (
                submitButton
            ) {

                submitButton.style.display =
                    "inline-flex";

                submitButton.disabled =
                    false;
            }

            showMessage(
                "ChronicAI has prepared the report. Please verify it before submitting.",
                "success"
            );

        } else {

            showMessage(
                "ChronicAI replied. You can continue the conversation.",
                "success"
            );
        }


        console.log(
            "ChronicAI response:",
            data
        );


    } catch (error) {

        console.error(
            "ChronicAI CONVERSATION ERROR:",
            error
        );


        showMessage(
            error?.message ||
            "Unable to communicate with ChronicAI. Please try again."
        );


    } finally {

        isAnalyzing =
            false;

        setAnalyzeLoading(
            false
        );
    }
}


// ============================================================
// ANALYZE BUTTON
// ============================================================

if (
    analyzeButton
) {

    analyzeButton.addEventListener(
        "click",
        analyzeReport
    );
}


// ============================================================
// FORM SUBMIT
// ============================================================

if (
    reportForm
) {

    reportForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            await submitReport();

        }
    );
}


// ============================================================
// SUBMIT REPORT
// ============================================================

async function submitReport() {

    if (isSubmitting) {
        return;
    }

    clearMessage();


    // ========================================================
    // CHECK AUTH
    // ========================================================

    if (!currentUser) {

        const storedUser =
            getStoredUser();

        if (
            !storedUser?.uid
        ) {

            showMessage(
                "Please login before submitting a civic report."
            );

            setTimeout(
                () => {

                    window.location.href =
                        "login.html";

                },
                1000
            );

            return;
        }
    }


    // ========================================================
    // CHECK CONVERSATION
    // ========================================================

    if (
        !conversation.length
    ) {

        showMessage(
            "Please talk with ChronicAI before submitting the report."
        );

        return;
    }


    // ========================================================
    // CHECK AI
    // ========================================================

    if (
        !currentAnalysis &&
        !reportReady
    ) {

        showMessage(
            "Please let ChronicAI understand and prepare the report before submitting."
        );

        return;
    }


    // ========================================================
    // VERIFY
    // ========================================================

    if (
        verificationCheckbox &&
        !verificationCheckbox.checked
    ) {

        showMessage(
            "Please verify that the AI-generated report is accurate before submitting."
        );

        verificationCheckbox.focus();

        return;
    }


    // ========================================================
    // INPUT
    // ========================================================

    const description =
        descriptionInput?.value
            ?.trim() ||
        "";

    const location =
        locationInput?.value
            ?.trim() ||
        "";


    if (!location) {

        showMessage(
            "Location is required."
        );

        return;
    }


    // ========================================================
    // START SUBMIT
    // ========================================================

    isSubmitting =
        true;

    setSubmitLoading(
        true
    );


    showMessage(
        "Submitting your civic report...",
        "warning"
    );


    try {

        // ====================================================
        // UID
        // ====================================================

        const uid =
            currentUser?.uid ||
            getStoredUser()?.uid ||
            localStorage.getItem(
                "ChronicAIUserId"
            ) ||
            "";


        const email =
            currentUser?.email ||
            getCitizenEmail();


        const name =
            getCitizenName();


        // ====================================================
        // REPORT DATA
        // ====================================================

        const reportPayload = {

            reporterName:
                name,

            reporterEmail:
                email,

            citizenUid:
                uid,

            description,

            location,

            image:
                selectedImageData ||
                null,

            analysis:
                currentAnalysis,

            conversation:

                conversation,

            submittedAt:
                new Date()
                    .toISOString()
        };


        // ====================================================
        // SUBMIT TO SERVER
        // ====================================================

        const response =
            await fetch(
                `${API_BASE}/api/reports`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            reportPayload
                        )

                }
            );


        // ====================================================
        // RESPONSE
        // ====================================================

        let data;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                "Server returned an invalid response."
            );
        }


        // ====================================================
        // ERROR
        // ====================================================

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data?.error ||
                data?.message ||
                "Unable to submit report."
            );
        }


        // ====================================================
        // SUCCESS
        // ====================================================

        const reportId =
            data.reportId ||
            data.report?.reportId ||
            "";


        showMessage(

            reportId
                ? `Report submitted successfully. Your Report ID is ${reportId}.`
                : "Report submitted successfully.",

            "success"

        );


        // ====================================================
        // UPDATE USER REPORT COUNT
        // ====================================================

        if (
            uid
        ) {

            try {

                await updateCitizenReportCount(
                    uid
                );

            } catch (
                profileError
            ) {

                console.warn(
                    "Unable to update citizen report count:",
                    profileError
                );
            }
        }


        // ====================================================
        // SAVE LAST REPORT
        // ====================================================

        if (
            data.report
        ) {

            localStorage.setItem(
                "ChronicAILastReport",
                JSON.stringify(
                    data.report
                )
            );
        }


        if (
            reportId
        ) {

            localStorage.setItem(
                "ChronicAILastReportId",
                reportId
            );
        }


        // ====================================================
        // DISABLE SUBMIT
        // ====================================================

        if (
            submitButton
        ) {

            submitButton.disabled =
                true;

            submitButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                Report Submitted
            `;
        }


        console.log(
            "ChronicAI report submitted:",
            data
        );


    } catch (error) {

        console.error(
            "ChronicAI REPORT SUBMISSION ERROR:",
            error
        );


        showMessage(
            error?.message ||
            "Unable to submit the civic report."
        );


        setSubmitLoading(
            false
        );


    } finally {

        isSubmitting =
            false;
    }
}


// ============================================================
// UPDATE CITIZEN REPORT COUNT
// ============================================================

async function updateCitizenReportCount(
    uid
) {

    const userRef =
        ref(
            database,
            `users/${uid}`
        );

    const snapshot =
        await get(
            userRef
        );


    if (
        !snapshot.exists()
    ) {

        return;
    }


    const profile =
        snapshot.val();


    const currentCount =
        Number(
            profile.totalReports
        ) || 0;


    await update(
        userRef,
        {

            totalReports:
                currentCount + 1,

            lastReportAt:
                new Date()
                    .toISOString()

        }
    );
}


// ============================================================
// RESET REPORT
// ============================================================

function resetReport() {

    currentAnalysis =
        null;

    selectedImageData =
        null;

    conversation =
        [];

    reportReady =
        false;


    if (
        reportForm
    ) {

        reportForm.reset();
    }


    if (
        imagePreview
    ) {

        imagePreview.src =
            "";

        imagePreview.style.display =
            "none";
    }


    if (
        aiResult
    ) {

        aiResult.innerHTML =
            "";

        aiResult.style.display =
            "none";
    }


    if (
        verificationSection
    ) {

        verificationSection.style.display =
            "none";
    }


    if (
        submitButton
    ) {

        submitButton.style.display =
            "none";

        submitButton.disabled =
            false;

        submitButton.innerHTML = `
            <i class="fa-solid fa-paper-plane"></i>
            Submit Report
        `;
    }


    clearMessage();


    console.log(
        "ChronicAI report conversation reset."
    );
}


// ============================================================
// RESET BUTTON
// ============================================================

if (
    resetButton
) {

    resetButton.addEventListener(
        "click",
        resetReport
    );
}


// ============================================================
// REANALYZE / CONTINUE CONVERSATION
// ============================================================

if (
    reanalyzeButton
) {

    reanalyzeButton.addEventListener(
        "click",
        async () => {

            await analyzeReport();

        }
    );
}


// ============================================================
// ENTER KEY SUPPORT
// ============================================================

if (
    descriptionInput
) {

    descriptionInput.addEventListener(
        "keydown",
        async (event) => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                await analyzeReport();
            }
        }
    );
}


// ============================================================
// INITIAL STATE
// ============================================================

if (
    submitButton
) {

    submitButton.style.display =
        "none";
}


if (
    verificationSection
) {

    verificationSection.style.display =
        "none";
}


if (
    aiResult
) {

    aiResult.style.display =
        "none";
}


// ============================================================
// PAGE INITIALIZATION
// ============================================================

console.log(
    "================================================"
);

console.log(
    "ChronicAI REPORT PROBLEM MODULE"
);

console.log(
    "Conversational AI: READY"
);

console.log(
    "Image Vision: READY"
);

console.log(
    "Location Context: READY"
);

console.log(
    "Conversation Memory: READY"
);

console.log(
    "Citizen Verification: READY"
);

console.log(
    "Report Submission: READY"
);

console.log(
    "================================================"
);