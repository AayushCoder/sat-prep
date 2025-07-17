import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDpOYp9ZCYImNMHBF_DL2IFCWq8z885Ris",
    authDomain: "sat-prep-f77b1.firebaseapp.com",
    projectId: "sat-prep-f77b1",
    storageBucket: "sat-prep-f77b1.appspot.com",
    messagingSenderId: "917298606983",
    appId: "1:917298606983:web:2e1fb2605afdb380f91922",
    measurementId: "G-NFNQJHQP32"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const typeSelect = document.getElementById('typeSelect');
    const difficultySelect = document.getElementById('difficultySelect');
    const domainSelect = document.getElementById('domainSelect');
    const filterBtn = document.getElementById('filterBtn');
    const nextBtn = document.getElementById('nextBtn');
    const reviewBtn = document.getElementById('reviewBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const questionContainer = document.getElementById('question-container');
    const showRationaleBtn = document.getElementById('showRationaleBtn');
    const rationaleElement = document.getElementById('rationale');
    
    // Statistics elements
    const totalQuestionsEl = document.getElementById('totalQuestions');
    const correctAnswersEl = document.getElementById('correctAnswers');
    const percentageEl = document.getElementById('percentage');
    const streakCountEl = document.getElementById('streakCount');

    let currentQuestion = null;
    let userDocRef = null;
    let lastFilter = null;
    let stats = {
        totalQuestions: 0,
        correctAnswers: 0,
        currentStreak: 0,
        maxStreak: 0
    };

    // Initialize the app
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User authenticated:", user.uid);
            userDocRef = doc(db, "users", user.uid);
            await initializeUserQuestions();
            await loadStats();
            loadQuestion();
        } else {
            window.location.href = 'index.html';
        }
    });

    // Event listeners
    filterBtn.addEventListener('click', () => {
        if (lastFilter === getCurrentFilter()) {
            alert("You are already viewing questions with the current filter.");
        } else {
            loadQuestion();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestion) {
            alert("Please answer the current question before moving to the next one.");
        } else {
            loadQuestion();
        }
    });

    reviewBtn.addEventListener('click', () => {
        window.location.href = 'review.html';
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        });
    });

    showRationaleBtn.addEventListener('click', () => {
        const rationale = showRationaleBtn.getAttribute('data-rationale');
        if (rationale) {
            rationaleElement.innerHTML = `
                <h4>Explanation</h4>
                <p>${rationale}</p>
            `;
            rationaleElement.classList.remove('hidden');
        }
    });

    async function initializeUserQuestions() {
        try {
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                console.log("Initializing user document and questions.");
                await setDoc(userDocRef, {
                    answeredQuestions: [],
                    stats: {
                        totalQuestions: 0,
                        correctAnswers: 0,
                        currentStreak: 0,
                        maxStreak: 0
                    }
                });

                const questionRef = collection(db, "Reading and Writing");
                const querySnapshot = await getDocs(questionRef);
                const allQuestions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const userQuestionsCollectionRef = collection(userDocRef, "userQuestions");
                for (const question of allQuestions) {
                    await setDoc(doc(userQuestionsCollectionRef, question.id), question);
                }

                await setDoc(doc(userDocRef, "settings"), { initialized: true });
                console.log("User document and questions initialized.");
            } else {
                console.log("User document exists, checking initialization.");
                const userQuestionsDoc = await getDoc(doc(userDocRef, "settings"));
                if (!userQuestionsDoc.exists() || !userQuestionsDoc.data().initialized) {
                    console.log("Initializing user questions.");
                    const questionRef = collection(db, "Reading and Writing");
                    const querySnapshot = await getDocs(questionRef);
                    const allQuestions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    const userQuestionsCollectionRef = collection(userDocRef, "userQuestions");
                    for (const question of allQuestions) {
                        await setDoc(doc(userQuestionsCollectionRef, question.id), question);
                    }

                    await setDoc(doc(userDocRef, "settings"), { initialized: true });
                    console.log("User questions initialized.");
                }
            }
        } catch (error) {
            console.error("Error initializing user questions:", error);
        }
    }

    async function loadStats() {
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userStats = userDoc.data().stats || {};
                stats = {
                    totalQuestions: userStats.totalQuestions || 0,
                    correctAnswers: userStats.correctAnswers || 0,
                    currentStreak: userStats.currentStreak || 0,
                    maxStreak: userStats.maxStreak || 0
                };
                updateStatsDisplay();
            }
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    }

    function updateStatsDisplay() {
        totalQuestionsEl.textContent = stats.totalQuestions;
        correctAnswersEl.textContent = stats.correctAnswers;
        
        const percentage = stats.totalQuestions > 0 ? 
            Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0;
        percentageEl.textContent = percentage + '%';
        
        streakCountEl.textContent = stats.currentStreak;
    }

    async function recordAnswer(isCorrect) {
        stats.totalQuestions++;
        
        if (isCorrect) {
            stats.correctAnswers++;
            stats.currentStreak++;
            if (stats.currentStreak > stats.maxStreak) {
                stats.maxStreak = stats.currentStreak;
            }
        } else {
            stats.currentStreak = 0;
        }
        
        updateStatsDisplay();
        
        // Save stats to Firestore
        try {
            await setDoc(userDocRef, { stats }, { merge: true });
        } catch (error) {
            console.error("Error saving stats:", error);
        }
    }

    async function loadQuestion() {
        if (!userDocRef) return;

        const questionType = typeSelect.value;
        const difficulty = difficultySelect.value;
        const domain = domainSelect.value;

        const userQuestionsRef = collection(userDocRef, "userQuestions");
        const userDoc = await getDoc(userDocRef);
        const answeredQuestions = userDoc.exists() ? userDoc.data().answeredQuestions || [] : [];
        console.log("Answered questions:", answeredQuestions);

        let q = query(userQuestionsRef);

        if (difficulty) {
            q = query(q, where("difficulty", "==", difficulty));
        }

        if (domain) {
            q = query(q, where("domain", "==", domain));
        }

        if (answeredQuestions.length > 0) {
            const answeredIds = answeredQuestions.map(a => a.id);
            q = query(q, where("id", "not-in", answeredIds));
        }

        const querySnapshot = await getDocs(q);
        console.log("Filtered questions query snapshot:", querySnapshot.docs.map(doc => doc.id));

        if (!querySnapshot.empty) {
            currentQuestion = querySnapshot.docs[Math.floor(Math.random() * querySnapshot.docs.length)].data();
            console.log("Loaded question:", currentQuestion);
            displayQuestion(currentQuestion);
            lastFilter = getCurrentFilter();
        } else {
            questionContainer.innerHTML = `
                <div class="question-text">
                    No more questions available for this filter. Try changing your filter settings.
                </div>
            `;
            currentQuestion = null;
        }
    }

    function getCurrentFilter() {
        return {
            type: typeSelect.value,
            difficulty: difficultySelect.value,
            domain: domainSelect.value
        };
    }

    function displayQuestion(questionData) {
        // Assuming the ID is the first 8 characters of the question string
        const idRegex = /^ID:\s*(\w{8})\s*/;
        const questionIdMatch = questionData.question.match(idRegex);
        const questionId = questionIdMatch ? questionIdMatch[1] : '';

        // Remove the ID from the question text
        const questionWithoutId = questionData.question.replace(idRegex, '').trim();

        // Extract choices using regex
        const choicesRegex = /([A-D]\..+?)(?=[A-D]\.|Answer|$)/gs;
        const questionParts = questionWithoutId.match(choicesRegex);
        const formattedQuestion = questionWithoutId.split(choicesRegex)[0].trim();
        let choices = questionParts ? questionParts.map(choice => choice.trim()) : [];

        // Remove the ID from the end of choice D if it exists
        if (choices.length === 4) {
            choices[3] = choices[3].replace(/ID:\s*\w+$/, '').trim();
        }

        questionContainer.innerHTML = `
            <div class="question-text">
                <p class="font-semibold text-sm mb-1">Question ID: ${questionId}</p>
                <p>${formattedQuestion}</p>
            </div>
            <div class="choices-container">
                ${choices.map((choice, index) => `
                    <button class="choice-btn" data-choice="${String.fromCharCode(65 + index)}">
                        ${choice}
                    </button>
                `).join('')}
            </div>
            <div id="feedback" class="mt-4" style="display: none;"></div>
        `;

        // Add event listeners to choice buttons
        document.querySelectorAll('.choice-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const selectedChoice = btn.getAttribute('data-choice');
                submitAnswer(questionData, btn, selectedChoice, choices);
            });
        });

        // Reset rationale display
        showRationaleBtn.classList.add('hidden');
        rationaleElement.classList.add('hidden');
        showRationaleBtn.removeAttribute('data-rationale');
    }

    async function submitAnswer(questionData, selectedBtn, selectedChoice, choices) {
        const feedback = document.getElementById('feedback');
        const correctAnswer = questionData.correct_answer.split(', ')[0].trim();

        console.log("Selected answer:", selectedChoice);
        console.log("Correct answer:", correctAnswer);

        // Disable all choice buttons
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.disabled = true;
        });

        // Mark the selected answer
        selectedBtn.classList.add('selected');

        // Check if answer is correct
        const isCorrect = selectedChoice === correctAnswer;
        
        // Record the answer in stats
        await recordAnswer(isCorrect);

        // Show correct/incorrect feedback
        if (isCorrect) {
            feedback.textContent = "Correct!";
            feedback.style.color = "#48bb78";
            selectedBtn.classList.add('correct');
        } else {
            feedback.textContent = `Incorrect. The correct answer is: ${correctAnswer}`;
            feedback.style.color = "#f56565";
            selectedBtn.classList.add('incorrect');
            
            // Also highlight the correct answer
            document.querySelectorAll('.choice-btn').forEach(btn => {
                if (btn.getAttribute('data-choice') === correctAnswer) {
                    btn.classList.add('correct');
                }
            });
        }

        feedback.style.display = "block";
        showRationaleBtn.classList.remove('hidden');

        // Store rationale in button for later display
        showRationaleBtn.setAttribute('data-rationale', questionData.rationale || 'No explanation available.');

        await saveAnsweredQuestion(
            questionData.id,
            questionData.question,
            choices,
            questionData.correct_answer,
            questionData.rationale,
            questionData.difficulty,
            questionData.domain,
            selectedChoice,
            isCorrect
        );

        currentQuestion = null;
    }

    async function saveAnsweredQuestion(
        questionId,
        questionText,
        choices,
        correctAnswer,
        rationale,
        difficulty,
        domain,
        userAnswer,
        isCorrect
    ) {
        if (!userDocRef) return;

        try {
            const answeredQuestionsRef = collection(userDocRef, "answeredQuestions");
            await setDoc(doc(answeredQuestionsRef, questionId), {
                question: questionText,
                choices: choices,
                correct_answer: correctAnswer,
                rationale: rationale,
                difficulty: difficulty,
                domain: domain,
                answer: userAnswer,
                isCorrect: isCorrect,
                timestamp: new Date()
            });

            // Remove the question from userQuestions collection
            const userQuestionsRef = collection(userDocRef, "userQuestions");
            await deleteDoc(doc(userQuestionsRef, questionId));

            console.log("Saved answered question:", questionId);
        } catch (error) {
            console.error("Error saving answered question:", error);
        }
    }
});
