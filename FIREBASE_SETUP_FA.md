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

## 3) Firestore Security Rules (نسخه پیشنهادی برای رفع خطای Permission)
فایل `firestore.rules` را دقیقاً به شکل زیر تنظیم و **Publish** کنید:

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
      return isSignedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    match /users/{userId} {
      allow create: if isOwner(userId)
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.email == request.auth.token.email
        && request.resource.data.role == "user"
        && request.resource.data.isDeleted == false;

      allow read: if isOwner(userId);

      allow update: if isOwner(userId)
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.email == resource.data.email
        && request.resource.data.role == resource.data.role
        && request.resource.data.createdAt == resource.data.createdAt;

      allow read, update, delete: if isAdmin();
    }
  }
}
```

> چرا این Rule خطا را رفع می‌کند؟
> - کاربر تازه‌ثبت‌نام‌شده اجازه دارد فقط سند خودش را بسازد (`users/{uid}`).
> - کاربر نمی‌تواند `role` را دستکاری کند (باید `user` بماند).
> - ادمین با `role == "admin"` امکان لیست/مدیریت همه کاربران را دارد.

## 4) نقش ادمین
برای ادمین شدن یک کاربر، مقدار role سند خودش را از `user` به `admin` تغییر دهید:

`users/{adminUid}.role = "admin"`

## 5) Deploy
- `firebase deploy --only functions`
- `firebase deploy --only firestore:rules`

## 6) عیب‌یابی خطای Permission
- اگر ثبت‌نام Auth موفق است ولی پروفایل ساخته نمی‌شود، لاگ Functions را بررسی کنید.
- اگر پنل ادمین لیست کاربران را نمی‌بیند، مطمئن شوید role کاربر ادمین واقعاً `admin` است.
