# راه‌اندازی Firebase (Auth + Firestore + Cloud Functions)

## 1) فعال‌سازی سرویس‌ها
1. در Firebase Console، **Authentication > Sign-in method** را باز کنید و **Email/Password** را فعال کنید.
2. **Firestore Database** را بسازید.
3. **Cloud Functions** را فعال کنید.

## 2) Cloud Function برای ساخت خودکار پروفایل کاربر
در مسیر `functions/index.js` این کد را قرار دهید (trigger روی Auth onCreate):

```js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createUserProfileOnAuthCreate = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const email = user.email || "";

  try {
    await admin.firestore().collection("users").doc(uid).set(
      {
        email,
        role: "user",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    functions.logger.info("User profile created from Auth trigger", { uid, email });
  } catch (error) {
    functions.logger.error("Failed to create user profile from Auth trigger", {
      uid,
      email,
      error: error.message,
      stack: error.stack,
    });
  }
});
```

## 3) Firestore Security Rules (امن)
فایل `firestore.rules`:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow create: if request.auth != null && request.auth.uid == userId;
      allow read, update, delete: if request.auth != null && request.auth.uid == userId;
    }

    match /admins/{adminId} {
      allow read: if request.auth != null && request.auth.uid == adminId;
      allow write: if false;
    }
  }
}
```

## 5) حذف واقعی کاربر (Auth + Firestore)
برای حذف واقعی کاربر باید Cloud Function داشته باشید (با Admin SDK):

```js
// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.deleteUserByAdmin = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return res.status(401).json({ ok: false, message: "Missing token" });

    const decoded = await admin.auth().verifyIdToken(token);
    const adminDoc = await admin.firestore().collection("admins").doc(decoded.uid).get();
    if (!adminDoc.exists) return res.status(403).json({ ok: false, message: "Not admin" });

    const uid = req.body && req.body.uid;
    if (!uid) return res.status(400).json({ ok: false, message: "uid is required" });

    await admin.auth().deleteUser(uid);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
});
```

بعد از deploy:
1. آدرس Function را در `js/firebase-config.js` داخل `deleteUserFunctionUrl` قرار بدهید.
2. uid ادمین را داخل `admins/{adminUid}` در Firestore ثبت کنید.
3. ادمین باید در Firebase Auth هم لاگین باشد تا ID Token ارسال شود.

## 6) نکات نسخه فعلی
- پنل ادمین الان برای حذف از `doc.id` استفاده می‌کند تا مشکل mismatch با `uid` رخ ندهد.
- حذف واقعی وقتی موفق است که Function بالا deploy شده باشد.
- اگر Function تنظیم نشده باشد، پنل ادمین خطای واضح نمایش می‌دهد.

## 7) تست سریع
1. `signup.html` را باز کنید و یک کاربر ثبت‌نام کنید.
2. `admin.html` را باز کنید، کاربر را حذف کنید.
3. دوباره با همان username ثبت‌نام کنید (در صورت حذف واقعی باید مجاز باشد).


## 8) خطای Missing or insufficient permissions در ثبت‌نام
اگر در Rules فقط دسترسی `users/{uid}` را به خود کاربر داده باشید،
کوئری گرفتن از کل `users` در فرانت‌اند (برای چک تکراری بودن username/phone) مجاز نیست و همین خطا را می‌دهد.

در نسخه فعلی پروژه، ثبت‌نام فقط با Firebase Auth + ساخت سند `users/{uid}` انجام می‌شود و چک یکتایی ایمیل با Auth است.
برای یکتایی username/phone باید یک Backend/Cloud Function امن پیاده کنید.
