// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDpOYp9ZCYImNMHBF_DL2IFCWq8z885Ris",
  authDomain: "sat-prep-f77b1.firebaseapp.com",
  projectId: "sat-prep-f77b1",
  storageBucket: "sat-prep-f77b1.appspot.com",
  messagingSenderId: "917298606983",
  appId: "1:917298606983:web:2e1fb2605afdb380f91922",
  measurementId: "G-NFNQJHQP32"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);