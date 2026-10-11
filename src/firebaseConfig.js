// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

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

// Keep native users signed in across Expo reloads and app restarts. Web uses
// Firebase's browser persistence implementation.
export const auth = Platform.OS === "web"
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
export const db = getFirestore(app);