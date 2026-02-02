# شرح السجلات في Console (Console Logs Guide)

## الفرق الأساسي

في تطبيق Next.js الخاص بنا:

| النوع | المكان | الأداة |
|------|------|-------|
| **Client Logs** | Browser Console | F12 → Console |
| **Server Logs** | Terminal/Server | حيث تشغل `npm run dev` |

## كل صفحة وسجلاتها

### 1. لوحة التحكم (`/` أو `/dashboard`)
**Browser Console سيظهر:**
```
[v0] Dashboard: Component mounted
[v0] Dashboard: Found users: 1
[v0] Dashboard: Loading data for user: user-1
[v0] Dashboard: Tasks: 2
[v0] Dashboard: Accounts: 3
[v0] Dashboard: Active tasks: 1
[v0] Dashboard: Total executions: 5
[v0] Dashboard: Dashboard data loaded successfully
```

### 2. صفحة المهام (`/tasks`)
**Browser Console سيظهر:**
```
[v0] TasksPage: Component mounted
[v0] TasksPage: Found users: 1
[v0] TasksPage: Loading tasks for user: user-1
[v0] TasksPage: Tasks loaded: 2
```

**عند الضغط على زر Delete:**
```
[v0] handleDelete: Attempting to delete task: task-123
[v0] handleDelete: Task deleted successfully
```

**عند تفعيل/إيقاف مهمة:**
```
[v0] handleToggleStatus: Changing status of task: task-123 to: paused
[v0] handleToggleStatus: Status updated successfully
```

### 3. إنشاء مهمة جديدة (`/tasks/new`)
**Browser Console سيظهر عند الفتح:**
```
[v0] CreateTaskPage: Component mounted
[v0] CreateTaskPage: Found users: 1
[v0] CreateTaskPage: User found: user-1
[v0] CreateTaskPage: User accounts: 3
```

**عند الضغط على Save:**
```
[v0] handleSubmit: Form submitted
[v0] formData: {
  name: "Facebook to Twitter",
  description: "Daily sync",
  sourceAccounts: ["acc-1"],
  targetAccounts: ["acc-2"],
  executionType: "immediate",
  scheduleTime: "",
  recurringPattern: "daily"
}
[v0] handleSubmit: Users found: 1
[v0] handleSubmit: Creating task for user: user-1
[v0] handleSubmit: Task created successfully: task-456
```

## كيفية الوصول إلى Console

### الطريقة 1: اختصار لوحة المفاتيح (الأسرع)
- **Windows/Linux:** `Ctrl + Shift + I` ثم `Tab` للذهاب إلى Console
- **Mac:** `Cmd + Option + I` ثم `Tab` للذهاب إلى Console
- **أو مباشرة:** `F12` على أي متصفح

### الطريقة 2: من القائمة
**Chrome/Edge:**
1. انقر على الثلاث نقاط (≡) أعلى يمين المتصفح
2. اختر "More tools" ← "Developer tools"
3. اختر التبويب "Console"

**Firefox:**
1. انقر على ≡ أعلى يمين المتصفح
2. اختر "More tools" ← "Browser console"
3. أو انقر على "Inspector" ثم اختر "Console"

**Safari:**
1. اختر Safari → Preferences
2. اذهب إلى "Advanced" وفعّل "Show Develop menu in menu bar"
3. اختر Develop ← "Show JavaScript Console"

## نصائح مفيدة

### 1. البحث في السجلات
- اكتب في حقل البحث في Console
- ابحث عن `[v0]` لرؤية جميع السجلات المخصصة لدينا فقط

### 2. فلترة الأخطاء
- انقر على "Errors" لعرض الأخطاء فقط
- انقر على "Warnings" لعرض التحذيرات فقط

### 3. تنظيم السجلات
السجلات مرتبة حسب الوقت من الأقدم للأحدث. يمكنك:
- التمرير لأعلى لرؤية السجلات القديمة
- التمرير لأسفل لرؤية السجلات الجديدة

### 4. تصدير السجلات
```javascript
// انسخ الكود التالي والصقه في Console:
copy(console.log.toString())
```

## رسائل الخطأ الشائعة

### 1. "filter is not a function"
**السبب:** المتغير ليس مصفوفة
**الحل:** تم إصلاح هذا - نتحقق الآن من أن القيمة مصفوفة قبل الاستخدام

### 2. "Cannot read property 'id' of undefined"
**السبب:** محاولة الوصول لخاصية من قيمة فارغة
**الحل:** نتحقق الآن من وجود البيانات قبل الاستخدام

### 3. "ReferenceError: db is not defined"
**السبب:** لم تتم استيراد `db`
**الحل:** تأكد من استيراد: `import { db } from '@/lib/db'`

## التحقق من أن السجلات تعمل

1. افتح أي صفحة من صفحات التطبيق
2. اضغط `F12` لفتح Developer Tools
3. اختر التبويب "Console"
4. يجب أن ترى سجلات تبدأ بـ `[v0]`
5. إذا لم تر أي شيء، جرب:
   - تحديث الصفحة (F5)
   - مسح الـ cache (Ctrl+Shift+Delete)
   - استخدام متصفح مختلف

## السجلات حسب النوع

### معلومات (Info) - سيراها بلون أبيض/أزرق
```javascript
console.log('[v0] Information message');
```

### تحذيرات (Warnings) - سيراها بلون أصفر
```javascript
console.warn('[v0] Warning message');
```

### أخطاء (Errors) - سيراها بلون أحمر
```javascript
console.error('[v0] Error message');
```

في الكود الحالي نستخدم:
- `console.log()` للمعلومات العادية
- `console.warn()` عند عدم العثور على بيانات
- `console.error()` عند حدوث خطأ

## الآن جاهز للتصحيح!

فقط اتبع الخطوات:
1. افتح التطبيق في المتصفح
2. اضغط `F12`
3. اختر "Console"
4. قم بأي إجراء في التطبيق
5. شاهد السجلات تظهر مباشرة!

استمتع بالتصحيح! 🎉
