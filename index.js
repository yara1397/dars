const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createUserProfileOnAuthCreate = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const email = user.email || "";

  try {
    // merge: true یعنی اگر کلاینت زودتر داکیومنت را ساخته باشد، فقط فیلدهای جدید اضافه می‌شود
    await admin.firestore().collection("users").doc(uid).set(
      {
        uid: uid,
        email: email,
        role: "user",
        isDeleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    functions.logger.info("User profile created/merged from Auth trigger", { uid, email });
  } catch (error) {
    functions.logger.error("Failed to create user profile from Auth trigger", {
      uid,
      email,
      error: error.message,
      stack: error.stack,
    });
  }
});

exports.deleteUserByAdmin = functions.https.onRequest(async (req, res) => {
  // CORS header
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return res.status(401).json({ ok: false, message: "Missing token" });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const adminDoc = await admin.firestore().collection("users").doc(decoded.uid).get();
    const adminRole = adminDoc.exists ? adminDoc.data().role : null;

    if (adminRole !== "admin") {
      return res.status(403).json({ ok: false, message: "Not admin" });
    }

    const uid = req.body && req.body.uid;
    if (!uid) {
      return res.status(400).json({ ok: false, message: "uid is required" });
    }

    // حذف از Auth
    await admin.auth().deleteUser(uid);

    // حذف داکیومنت از Firestore
    await admin.firestore().collection("users").doc(uid).delete();

    return res.json({ ok: true });
  } catch (error) {
    functions.logger.error("deleteUserByAdmin failed", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ ok: false, message: error.message });
  }
});
