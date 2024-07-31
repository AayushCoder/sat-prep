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

		let currentQuestion = null;
		let userDocRef = null;
		let lastFilter = null;

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

		onAuthStateChanged(auth, async (user) => {
				if (user) {
						console.log("User authenticated:", user.uid);
						userDocRef = doc(db, "users", user.uid);
						await initializeUserQuestions();
						loadQuestion();
				} else {
						window.location.href = 'index.html';
				}
		});

		async function initializeUserQuestions() {
				try {
						const userDoc = await getDoc(userDocRef);
						if (!userDoc.exists()) {
								console.log("Initializing user document and questions.");
								// Create a new user document and add all questions
								await setDoc(userDocRef, {
										answeredQuestions: []
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
						currentQuestion = querySnapshot.docs[Math.floor(Math.random() * querySnapshot.docs.length)];
						console.log("Loaded question:", currentQuestion.data());
						displayQuestion(currentQuestion.data());
						lastFilter = getCurrentFilter();
				} else {
						questionContainer.innerHTML = "<p class='text-red-500'>No more questions available for this filter.</p>";
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
					<div class="question-box p-6 border rounded-lg bg-white mb-6 shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1">
							<p class="font-semibold text-sm mb-1">Question ID: ${questionId}</p>
							<p class="font-semibold text-lg mb-2">${formattedQuestion}</p>
							<div id="choices-container" class="space-y-3">
									${choices.map(choice => `<button class="choice-btn bg-gray-200 p-2 rounded-lg shadow-md w-full text-left transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105">${choice}</button>`).join('')}
							</div>
							<p id="feedback" class="mt-4" style="display: none;"></p>
					</div>
			`;

			document.querySelectorAll('.choice-btn').forEach(btn => {
					btn.addEventListener('click', () => submitAnswer(questionData, btn, choices));
			});
	}





	async function submitAnswer(questionData, selectedBtn, choices) {
			const feedback = document.getElementById('feedback');
			const questionBox = document.querySelector('.question-box');
			const selectedAnswer = selectedBtn.textContent.split('. ')[0];
			const correctAnswer = questionData.correct_answer.split(', ')[0]; // Assuming multiple answers could be separated by commas
			const rationale = questionData.rationale;

			console.log("Selected answer:", selectedAnswer);
			console.log("Correct answer:", correctAnswer);

			if (selectedAnswer === correctAnswer) {
					feedback.textContent = "Correct!";
					feedback.style.color = "green";
					questionBox.style.backgroundColor = "#d4edda"; // Green tint
			} else {
					feedback.textContent = `Incorrect. Correct answer is: ${correctAnswer}`;
					feedback.style.color = "red";
					questionBox.style.backgroundColor = "#f8d7da"; // Red tint
			}

			feedback.style.display = "block";

			document.querySelectorAll('.choice-btn').forEach(btn => {
					btn.disabled = true;
			});

			// Automatically display rationale content
			const rationaleElement = document.createElement('p');
			rationaleElement.textContent = `Rationale: ${rationale}`;
			rationaleElement.classList.add('rationale');
			rationaleElement.style.marginTop = '1rem';
			questionBox.appendChild(rationaleElement);

			await saveAnsweredQuestion(
					questionData.id,
					questionData.question,
					choices,
					questionData.correct_answer,
					questionData.rationale,
					questionData.difficulty,
					questionData.domain,
					selectedAnswer
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
				userAnswer
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
								answer: userAnswer
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
