import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC0GP9V7rxM9uDJ6iVjUjB138ADqu8_ZZE",


    authDomain: "was-essen-wir-heute-4ee84.firebaseapp.com",


    projectId: "was-essen-wir-heute-4ee84",
  };

  const app = initializeApp(firebaseConfig);

  export const db = getFirestore(app);
export const auth = getAuth(app);
