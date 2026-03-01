# خلاصه مشکلات و تغییرات اعمال شده

## مشکل ۱: خطای ثبت‌نام (signup.html)
### علت:
کد قبلی **قبل از ساخت اکانت** دو کوئری روی کل کالکشن `users` می‌زد:
```js
// ❌ کاربر هنوز لاگین نکرده، پس request.auth == null
db.collection("users").where("username", "==", username).get()
db.collection("users").where("phone", "==", phone).get()
```
ولی Rules فقط `allow read: if isOwner(userId)` دارد — یعنی فقط خواندن سند خود کاربر مجاز است، نه کوئری روی کل کالکشن.

علاوه بر این، فیلد `role: "user"` در داکیومنت ارسال نمی‌شد، در حالی که Rules شرط `request.resource.data.role == "user"` را دارد.

### رفع:
- کوئری‌های چک یکتایی username/phone **حذف شدند** (این چک باید در Backend/Cloud Function انجام شود)
- فیلد `role: "user"` به `set()` اضافه شد

---

## مشکل ۲: پنل ادمین (admin.html)
### علت:
لاگین ادمین با مقادیر هاردکد بود (`admin` / `123456`) — نه با Firebase Auth. بنابراین:
- ادمین توکن احراز هویت نداشت
- `loadUsers()` که `db.collection("users").get()` می‌زد با خطای permission مواجه می‌شد
- تابع `isAdmin()` در Rules به `request.auth` نیاز دارد که null بود

### رفع:
- لاگین ادمین از طریق **Firebase Auth** (`signInWithEmailAndPassword`) انجام می‌شود
- بعد از لاگین، نقش `role: "admin"` از Firestore چک می‌شود
- حالا ادمین توکن واقعی دارد و Rules اجازه خواندن همه کاربران را می‌دهد

---

## مشکل ۳: Cloud Function (functions/index.js)
### رفع:
- فیلدهای `uid` و `isDeleted` به `createUserProfileOnAuthCreate` اضافه شدند (سازگاری با Rules)
- CORS headers به `deleteUserByAdmin` اضافه شد
- حذف Firestore document هم داخل Function انجام می‌شود (نه فقط Auth)

---

## قدم بعدی: ساخت کاربر ادمین
برای اینکه پنل ادمین کار کند، باید یک کاربر ادمین بسازید:

1. یک کاربر عادی در `signup.html` ثبت‌نام کنید (مثلاً با ایمیل ادمین)
2. در Firebase Console > Firestore، سند آن کاربر را پیدا کنید
3. فیلد `role` را از `"user"` به `"admin"` تغییر دهید
4. حالا با همان ایمیل و رمز در `admin.html` لاگین کنید

---

## نکته مهم درباره یکتایی username و phone
چک یکتایی username و phone از فرانت‌اند با Rules فعلی **ممکن نیست** (چون نیاز به کوئری روی کل کالکشن دارد). 
برای پیاده‌سازی امن این قابلیت، باید یک **Cloud Function** بنویسید که قبل از ثبت‌نام، یکتایی را بررسی کند.
