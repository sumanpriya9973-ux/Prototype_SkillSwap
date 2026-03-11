import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCulss077QpKWLha3aO7Hj6e4LZYUCyc_M",
  authDomain: "universal-d26bc.firebaseapp.com",
  projectId: "universal-d26bc",
  storageBucket: "universal-d26bc.firebasestorage.app",
  messagingSenderId: "605673150058",
  appId: "1:605673150058:web:2915af74e277765f4b1c13",
  measurementId: "G-D470LQBL2Y"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
