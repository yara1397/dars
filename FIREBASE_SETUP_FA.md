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
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    match /users/{userId} {
      allow create: if false;
      allow read: if isOwner(userId) || isAdmin();
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
  }
}
```

> نکته: چون ساخت پروفایل توسط Cloud Function انجام می‌شود، در Rules برای کلاینت `allow create: if false` قرار داده‌ایم.

## 4) نقش ادمین
برای ادمین شدن یک کاربر، مقدار role سند خودش را از `user` به `admin` تغییر دهید:

`users/{adminUid}.role = "admin"`

## 5) Deploy
- `firebase deploy --only functions`
- `firebase deploy --only firestore:rules`

## 6) عیب‌یابی خطای Permission
- اگر ثبت‌نام Auth موفق است ولی پروفایل ساخته نمی‌شود، لاگ Functions را بررسی کنید.
- اگر پنل ادمین لیست کاربران را نمی‌بیند، مطمئن شوید role کاربر ادمین واقعاً `admin` است.
