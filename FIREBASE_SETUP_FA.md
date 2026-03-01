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
      allow read, update: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 5) نکته مهم پنل ادمین
- در نسخه فعلی، حذف کاربر در پنل ادمین به صورت **soft delete** انجام می‌شود (`isDeleted = true`).
- حذف کامل کاربر از Firebase Authentication با فرانت‌اند خالی امن نیست و باید از **Firebase Admin SDK + Cloud Functions/Backend** استفاده کنید.

## 6) تست سریع
1. `signup.html` را باز کنید و یک کاربر ثبت‌نام کنید.
2. `index.html` وارد شوید.
3. `admin.html` را باز کنید و لیست کاربران را ببینید.
