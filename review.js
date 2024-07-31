import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, doc, deleteDoc, setDoc, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

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
		const resetBtn = document.getElementById('resetBtn');
		const backToQuestionsBtn = document.getElementById('backToQuestionsBtn');
		const logoutBtn = document.getElementById('logoutBtn');
		const questionsContainer = document.getElementById('questions-container');

		let userDocRef = null;

		filterBtn.addEventListener('click', loadAnsweredQuestions);

		logoutBtn.addEventListener('click', () => {
				signOut(auth).then(() => {
						window.location.href = 'index.html';
				});
		});

		backToQuestionsBtn.addEventListener('click', () => {
				window.location.href = 'questions.html'; // Redirect to the main questions page
		});

	resetBtn.addEventListener('click', async () => {
			if (!userDocRef) return;

			const answeredQuestionsRef = collection(userDocRef, "answeredQuestions");
			const userQuestionsRef = collection(userDocRef, "userQuestions");

			// Build the query with filters
			let q = query(answeredQuestionsRef);

			const questionType = typeSelect.value;
			const difficulty = difficultySelect.value;
			const domain = domainSelect.value;

			if (difficulty) {
					q = query(q, where("difficulty", "==", difficulty));
			}

			if (domain) {
					q = query(q, where("domain", "==", domain));
			}

			try {
					// Get all answered questions matching the filters
					const answeredQuestionsSnapshot = await getDocs(q);

					if (answeredQuestionsSnapshot.empty) {
							alert("No answered questions found for the selected filters.");
							return;
					}

					// Process each question in the filtered list
					const batch = writeBatch(db);
					answeredQuestionsSnapshot.forEach(docSnapshot => {
							const docId = docSnapshot.id;
							const questionData = docSnapshot.data();

							// Remove from answeredQuestions
							batch.delete(doc(answeredQuestionsRef, docId));

							// Add to userQuestions
							batch.set(doc(userQuestionsRef, docId), questionData);
					});

					await batch.commit();

					alert("Filtered questions have been reset.");
					loadAnsweredQuestions(); // Refresh the list

			} catch (error) {
					console.error("Error resetting filtered questions:", error);
					alert("Error resetting filtered questions. Please try again.");
			}
	});



		onAuthStateChanged(auth, (user) => {
				if (user) {
						userDocRef = doc(db, "users", user.uid);
						console.log("User authenticated, userDocRef:", userDocRef); // Debugging line
						loadAnsweredQuestions();
				} else {
						window.location.href = 'index.html';
				}
		});

		async function loadAnsweredQuestions() {
				if (!userDocRef) return;

				const questionType = typeSelect.value;
				const difficulty = difficultySelect.value;
				const domain = domainSelect.value;
				const answeredQuestionsRef = collection(userDocRef, "answeredQuestions");

				let q = query(answeredQuestionsRef);

				if (difficulty) {
						q = query(q, where("difficulty", "==", difficulty));
				}

				if (domain) {
						q = query(q, where("domain", "==", domain));
				}

				try {
						const querySnapshot = await getDocs(q);

						if (!querySnapshot.empty) {
								questionsContainer.innerHTML = "";
								querySnapshot.forEach(docSnapshot => {
										const questionData = docSnapshot.data();
										console.log("Question Data:", questionData); // Debugging line
										displayQuestion(docSnapshot.id, questionData);
								});
						} else {
								questionsContainer.innerHTML = "<p class='text-red-500'>No answered questions available for this filter.</p>";
						}
				} catch (error) {
						console.error("Error loading answered questions: ", error);
						questionsContainer.innerHTML = "<p class='text-red-500'>Error loading questions. Please try again later.</p>";
				}
		}

	function displayQuestion(docId, questionData) {
			// Regex to remove the ID from the start of the question
			const idRegex = new RegExp(`^ID: ${docId}\\s*`, 'i');
			const questionText = questionData.question.replace(idRegex, '').trim();

			// Extract choices and separate them from the question text
			const choicesRegex = /([A-D]\..+?)(?=[A-D]\.|Answer|$)/gs;
			const questionParts = questionText.match(choicesRegex);
			const formattedQuestion = questionText.split(choicesRegex)[0].trim();
			const choices = questionParts ? questionParts.map(choice => choice.trim()) : [];

			const correctAnswer = questionData.correct_answer.split(', ')[0];
			const userAnswer = questionData.answer;

			const questionHTML = `
					<div class="question-box p-6 border rounded-lg bg-white mb-6 shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-100">
							<p class="font-semibold text-lg mb-2">ID: ${docId}</p>
							<p class="font-semibold text-lg mb-2">${formattedQuestion}</p>
							<div class="choices-container space-y-3">
									${choices.map(choice => `
											<button class="choice-btn ${choice.split('. ')[0] === correctAnswer ? 'bg-green-200' : choice.split('. ')[0] === userAnswer ? 'bg-red-200' : 'bg-gray-200'} p-2 rounded-lg shadow-md w-full text-left transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-100" disabled>${choice}</button>
									`).join('')}
							</div>
							<button class="mt-4 bg-blue-400 text-white px-4 py-2 rounded rationale-btn">Show Rationale</button>
							<p class="rationale mt-2 hidden">${questionData.rationale}</p>
							<button class="mt-4 bg-red-500 text-white px-4 py-2 rounded reset-btn" data-doc-id="${docId}">Reset</button>
					</div>
			`;

			questionsContainer.innerHTML += questionHTML;

			document.querySelectorAll('.rationale-btn').forEach(button => {
					button.addEventListener('click', toggleRationale);
			});

			document.querySelectorAll('.reset-btn').forEach(button => {
					button.addEventListener('click', resetQuestion);
			});
	}



		function toggleRationale(event) {
				const button = event.target;
				const rationale = button.nextElementSibling;
				if (rationale.classList.contains('hidden')) {
						rationale.classList.remove('hidden');
						rationale.classList.add('block');
						button.textContent = "Hide Rationale";
				} else {
						rationale.classList.remove('block');
						rationale.classList.add('hidden');
						button.textContent = "Show Rationale";
				}
		}

	async function resetQuestion(event) {
			if (!userDocRef) return;

			const docId = event.target.getAttribute('data-doc-id');
			const answeredQuestionsRef = collection(userDocRef, "answeredQuestions");
			const userQuestionsRef = collection(userDocRef, "userQuestions");

			try {
					// Retrieve the question data from answeredQuestions
					const answeredQuestionDoc = await getDoc(doc(answeredQuestionsRef, docId));

					if (!answeredQuestionDoc.exists()) {
							console.error("Question data not found in answeredQuestions.");
							alert("Error resetting question. Please try again.");
							return;
					}

					const questionData = answeredQuestionDoc.data();

					// Remove the question from answeredQuestions
					await deleteDoc(doc(answeredQuestionsRef, docId));

					// Add the question back to userQuestions
					await setDoc(doc(userQuestionsRef, docId), questionData);

					// Reload the filtered list to reflect the reset question
					loadAnsweredQuestions(); // Refresh the list

			} catch (error) {
					console.error("Error resetting question:", error);
					alert("Error resetting question. Please try again.");
			}
	}

});
