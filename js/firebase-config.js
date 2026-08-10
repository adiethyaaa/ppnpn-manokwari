// <script type="module">
  // Import the functions you need from the SDKs you need
  // import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
  // import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCAz10t2goPWwPf-7Bm43o2IAA5qKwT4vU",
    authDomain: "presensi-manokwari.firebaseapp.com",
    databaseURL: "https://presensi-manokwari-default-rtdb.firebaseio.com/",
    projectId: "presensi-manokwari",
    storageBucket: "presensi-manokwari.firebasestorage.app",
    messagingSenderId: "222271364248",
    appId: "1:222271364248:web:86655997b2ba7fe71ec4ed",
    measurementId: "G-R0SZDNCDJP"
  };

  // Inisialisasi Firebase
  firebase.initializeApp(firebaseConfig);

  // Buat referensi database global
  const db = firebase.database();

  // Initialize Firebase
  // const app = initializeApp(firebaseConfig);
  // const analytics = getAnalytics(app);
// </script>