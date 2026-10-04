// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCSSQwLkcmp1cvRBQgiYAssN8oPKJtqe9g",
  authDomain: "tastetrail-d879e.firebaseapp.com",
  projectId: "tastetrail-d879e",
  storageBucket: "tastetrail-d879e.firebasestorage.app",
  messagingSenderId: "568616972971",
  appId: "1:568616972971:web:811a51f93bc3392ba2fdee"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);