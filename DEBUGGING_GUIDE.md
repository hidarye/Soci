# دليل تصحيح الأخطاء (Debugging Guide)

## أين تظهر السجلات في Next.js

### 1. Browser Console (متصفح الويب)
**كيفية الوصول:** اضغط `F12` أو `Ctrl+Shift+I` ثم اختر التبويب "Console"

**السجلات التي تظهر هنا:**
- من Client Components (`'use client'`)
- من event handlers و interactions
- من useEffect hooks
- أي `console.log()` في الكود الذي يعمل في المتصفح

**مثال:**
```typescript
'use client';

export default function MyComponent() {
  useEffect(() => {
    console.log('[v0] This appears in BROWSER console'); // ✅ تظهر هنا
  }, []);

  const handleClick = () => {
    console.log('[v0] Click event - appears in BROWSER console'); // ✅ تظهر هنا
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### 2. Server/Terminal Console
**كيفية الوصول:** انظر إلى terminal/command line حيث تشغل `npm run dev`

**السجلات التي تظهر هنا:**
- من Server Components (بدون `'use client'`)
- من Server Actions
- من Route Handlers
- أي معالجة تحدث في الخادم

**مثال:**
```typescript
// بدون 'use client' - هذا Server Component

export default function ServerPage() {
  console.log('[v0] This appears in SERVER console (terminal)'); // ✅ تظهر في Terminal

  return <div>Content</div>;
}
```

## الصفحات الحالية وأماكن السجلات

### /app/page.tsx (Dashboard)
- `'use client'` → السجلات تظهر في **Browser Console**
- السجلات المضافة:
  - عند تحميل المكون
  - عند جلب البيانات
  - الأخطاء في جلب البيانات

### /app/tasks/new/page.tsx (Create Task)
- `'use client'` → السجلات تظهر في **Browser Console**
- السجلات المضافة:
  - [v0] CreateTaskPage: Component mounted
  - [v0] CreateTaskPage: Found users: X
  - [v0] handleSubmit: Form submitted
  - [v0] handleSubmit: Creating task for user: Y
  - [v0] handleSubmit: Task created successfully: Z

## خطوات فتح Browser Console

### في Chrome/Edge:
1. اضغط `F12` أو `Ctrl+Shift+I`
2. اختر التبويب "Console"
3. قم بالإجراء في التطبيق
4. ستجد السجلات في الـ Console

### في Firefox:
1. اضغط `F12` أو `Ctrl+Shift+I`
2. اختر التبويب "Console"
3. قم بالإجراء في التطبيق
4. ستجد السجلات في الـ Console

### في Safari:
1. اضغط `Cmd+Option+I`
2. اختر التبويب "Console"
3. قم بالإجراء في التطبيق
4. ستجد السجلات في الـ Console

## أمثلة السجلات المتوقعة

عند فتح صفحة `/tasks/new`:

```
[v0] CreateTaskPage: Component mounted
[v0] CreateTaskPage: Found users: 1
[v0] CreateTaskPage: User found: user-1
[v0] CreateTaskPage: User accounts: 3
```

عند ملء النموذج والضغط على "Save":

```
[v0] handleSubmit: Form submitted
[v0] formData: {name: "My Task", sourceAccounts: [...], ...}
[v0] handleSubmit: Users found: 1
[v0] handleSubmit: Creating task for user: user-1
[v0] handleSubmit: Task created successfully: task-123
```

## نصائح مفيدة

1. **استخدم البحث في Console:**
   - اكتب في حقل الفحص للبحث عن السجلات المحددة
   - ابحث عن `[v0]` لإيجاد جميع السجلات المضافة

2. **حفظ السجلات:**
   - انقر بزر الماوس الأيمن على Console
   - اختر "Save as" لحفظ السجلات

3. **تصفية السجلات:**
   - استخدم مربع الفلتر في Console
   - ابحث عن `error` لرؤية الأخطاء فقط

4. **استخدام Levels:**
   - `console.log()` - معلومات عادية
   - `console.warn()` - تحذيرات
   - `console.error()` - أخطاء
   - `console.info()` - معلومات إضافية

## ملفات تحتوي على السجلات المضافة

✅ `/app/tasks/new/page.tsx` - سجلات إنشاء المهام
✅ `/app/page.tsx` - سجلات Dashboard
✅ `/app/tasks/[id]/page.tsx` - سجلات تفاصيل المهمة
✅ `/app/accounts/page.tsx` - سجلات الحسابات

استمع إلى Browser Console عند استخدام التطبيق سترى جميع العمليات تحدث في الوقت الفعلي!
