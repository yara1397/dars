(function () {
  if (!window.FIREBASE_CONFIG) {
    console.error("Firebase config file is missing.");
    return;
  }

  var app = firebase.initializeApp(window.FIREBASE_CONFIG);
  var auth = firebase.auth(app);
  var db = firebase.firestore(app);

  window.firebaseClient = {
    app: app,
    auth: auth,
    db: db
  };
})();
