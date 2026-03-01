# بررسی کامل پروژه — همه باگ‌های پیدا شده

## 🔴 باگ بحرانی ۱: Race Condition در ثبت‌نام (signup.html)

### مشکل:
وقتی کاربر ثبت‌نام میکنه، دو چیز **همزمان** سعی میکنن داکیومنت `users/{uid}` رو بسازن:
1. **Cloud Function** `createUserProfileOnAuthCreate` (سمت سرور)
2. **کلاینت** `set()` (سمت مرورگر)

اگر Cloud Function **زودتر** اجرا بشه:
- داکیومنت قبلاً وجود داره
- `set()` کلاینت به عنوان **update** تلقی میشه (نه create)
- قانون update چک میکنه: `request.resource.data.createdAt == resource.data.createdAt`
- کلاینت `serverTimestamp()` جدید میفرسته ≠ مقدار قبلی → **Permission Denied** ❌

**نتیجه:** کاربر در Firebase Auth ساخته میشه ولی Firestore ناقصه (بدون username/phone).

### فیکس:
```js
// قبل (باگ‌دار):
await db.collection("users").doc(uid).set({
    ...fields,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

// بعد (فیکس شده):
await db.collection("users").doc(uid).set({
    ...fields
    // createdAt حذف شد — Cloud Function ست میکنه
}, { merge: true });  // merge: true اضافه شد
```

---

## 🔴 باگ بحرانی ۲: فیلد `role` ارسال نمیشد (signup.html)

### مشکل:
Rules شرط `request.resource.data.role == "user"` داره ولی کلاینت `role` نمیفرستاد.

### فیکس:
`role: "user"` به داده‌های ارسالی اضافه شد.

---

## 🔴 باگ بحرانی ۳: لاگین ادمین بدون Firebase Auth (admin.html)

### مشکل:
لاگین با مقادیر هاردکد (`admin`/`123456`) بود. بدون توکن واقعی Firebase، هیچ کوئری Firestore کار نمیکرد.

### فیکس:
لاگین از طریق `signInWithEmailAndPassword` انجام میشه + چک `role === "admin"`.

---

## 🟡 باگ متوسط ۴: فیلد ورود `id="username"` (index.html)

### مشکل:
کاربر ممکنه یوزرنیم وارد کنه به جای ایمیل → خطای `auth/invalid-email`.

### فیکس:
`id` به `"email"` تغییر کرد + `type="email"` + `dir="ltr"`.

---

## 🟢 باگ جزئی ۵: chess.html — تنظیم دوباره src

### مشکل:
در تابع `showLesson()` این خط دو بار تکرار شده:
```js
document.getElementById("lessonVideo").src = videos[lessonNumber];
document.getElementById("lessonVideo").src = videos[lessonNumber];
```
بی‌ضرره ولی یک خط اضافیه.

---

## ⚠️ نکته مهم: کاربران تست خراب

کاربرانی که قبل از فیکس ثبت‌نام کردن، ممکنه:
- در Auth وجود داشته باشن ولی Firestore ناقص باشه
- یا Firestore بدون فیلد username/phone باشه

**راه‌حل:** از Firebase Console:
1. به **Authentication > Users** برید و کاربران تست رو حذف کنید
2. به **Firestore > users** برید و داکیومنت‌های ناقص رو حذف کنید
3. دوباره تست کنید

---

## فایل‌های تغییر یافته:
1. `signup.html` — فیکس race condition + اضافه کردن role
2. `admin.html` — لاگین واقعی با Firebase Auth
3. `index.html` — فیلد ایمیل درست
4. `functions/index.js` — CORS + فیلدهای uid/isDeleted
5. `firestore.rules` — بدون تغییر (قوانین خودشون درست بودن)
