# راه‌اندازی Firebase برای ثبت‌نام و پنل ادمین

## 1) تکمیل تنظیمات پروژه Firebase
1. وارد Firebase Console شوید.
2. از **Project settings > Your apps** اطلاعات Web App را بردارید.
3. فایل `js/firebase-config.js` را باز کنید و مقادیر واقعی را جایگزین کنید.

## 2) فعال‌سازی Authentication
1. از منوی **Authentication > Sign-in method**.
2. روش **Email/Password** را فعال کنید.

## 3) ساخت Firestore Database
1. از منوی **Firestore Database** دیتابیس را ایجاد کنید.
2. Region را نزدیک کاربران انتخاب کنید (مثلاً europe-west).

## 4) قوانین امنیتی Firestore (نمونه اولیه)
> این قوانین برای شروع است. قبل از انتشار، حتماً سخت‌گیرانه‌تر کنید.

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
