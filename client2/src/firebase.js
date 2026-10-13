// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA5uTREBqqiasXHMQn67K35NWfq8qDc2LU",
  authDomain: "engageiqv1.firebaseapp.com",
  projectId: "engageiqv1",
  storageBucket: "engageiqv1.firebasestorage.app",
  messagingSenderId: "197140300835",
  appId: "1:197140300835:web:1b75d14100e201c78f5d96",
  measurementId: "G-NLTYPP93R4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const auth = getAuth(app)

export default app
