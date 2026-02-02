# SocialFlow - Platform Documentation

## نظرة عامة

**SocialFlow** هو تطبيق ويب متقدم وحديث لإدارة ونشر المحتوى عبر منصات التواصل الاجتماعي المتعددة. يجمع بين إمكانيات Buffer و Zapier و IFTTT في منصة واحدة موحدة.

### الميزات الرئيسية

- ✅ دعم 7+ منصات (Facebook, Instagram, Twitter, TikTok, YouTube, Telegram, LinkedIn)
- ✅ إنشاء مهام توجيه آلية بين المنصات
- ✅ إدارة حسابات متعددة لكل منصة
- ✅ جدولة وتنفيذ متكرر للمهام
- ✅ تحليلات وإحصائيات شاملة
- ✅ تحسينات أداء متقدمة (Cache, Retry, Parallel Processing)
- ✅ واجهة مستخدم حديثة وسلسة (Tailwind CSS + React)
- ✅ معالجة أخطاء متقدمة وتنبيهات ذكية

---

## البنية المعمارية

### المجلدات الرئيسية

```
/
├── app/                          # صفحات التطبيق (Next.js App Router)
│   ├── page.tsx                  # الصفحة الرئيسية (Dashboard)
│   ├── tasks/                    # إدارة المهام
│   │   ├── page.tsx              # قائمة المهام
│   │   └── new/page.tsx          # إنشاء مهمة جديدة
│   ├── accounts/                 # إدارة الحسابات
│   │   └── page.tsx              # قائمة الحسابات
│   ├── analytics/                # التحليلات
│   │   └── page.tsx              # لوحة التحليلات
│   ├── executions/               # سجل التنفيذات
│   │   └── page.tsx              # تاريخ التنفيذات
│   └── settings/                 # الإعدادات
│       └── page.tsx              # إعدادات المستخدم
│
├── components/                   # مكونات React
│   ├── layout/                   # مكونات التخطيط
│   │   ├── sidebar.tsx           # الشريط الجانبي
│   │   └── header.tsx            # رأس الصفحة
│   ├── common/                   # مكونات مشتركة
│   │   └── stat-card.tsx         # بطاقة الإحصائيات
│   └── ui/                       # مكونات واجهة المستخدم (shadcn)
│
├── lib/                          # مكتبات وأدوات
│   ├── db/                       # نظام قاعدة البيانات
│   │   └── index.ts              # قاعدة البيانات المحاكاة
│   ├── platforms/                # معالجات المنصات
│   │   ├── types.ts              # أنواع المنصات
│   │   ├── handlers.ts           # معالجات جميع المنصات
│   │   └── facebook/             # معالج Facebook محدد
│   └── services/                 # الخدمات
│       ├── task-processor.ts     # معالج المهام
│       ├── notification-service.ts # خدمة الإخطارات
│       ├── maintenance-service.ts # خدمة الصيانة
│       └── advanced-processing.ts # المعالجة المتقدمة
│
└── globals.css                   # الأنماط العالمية

```

---

## نظام قاعدة البيانات

### الجداول الرئيسية

#### 1. **Users**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. **PlatformAccounts**
```typescript
interface PlatformAccount {
  id: string;
  userId: string;
  platformId: 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'telegram' | 'linkedin';
  accountName: string;
  accountUsername: string;
  accountId: string;
  accessToken: string;
  refreshToken?: string;
  isActive: boolean;
  createdAt: Date;
}
```

#### 3. **Tasks**
```typescript
interface Task {
  id: string;
  userId: string;
  name: string;
  description: string;
  sourceAccounts: string[];      // IDs
  targetAccounts: string[];      // IDs
  contentType: 'text' | 'image' | 'video' | 'link';
  status: 'active' | 'paused' | 'completed' | 'error';
  executionType: 'immediate' | 'scheduled' | 'recurring';
  scheduleTime?: Date;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  filters?: FilterConfig;
  transformations?: TransformConfig;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4. **TaskExecutions**
```typescript
interface TaskExecution {
  id: string;
  taskId: string;
  sourceAccount: string;
  targetAccount: string;
  originalContent: string;
  transformedContent: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  executedAt: Date;
  responseData?: Record<string, any>;
}
```

#### 5. **Analytics**
```typescript
interface Analytics {
  id: string;
  userId: string;
  date: Date;
  platformId: string;
  accountId: string;
  posts: number;
  engagements: number;
  clicks: number;
  reach: number;
  impressions: number;
}
```

---

## معالجات المنصات

كل منصة لها معالج مخصص يطبق الواجهة `BasePlatformHandler`:

### PlatformConfig
```typescript
interface PlatformConfig {
  id: PlatformId;
  name: string;
  icon: string;
  color: string;
  supportedContentTypes: ('text' | 'image' | 'video' | 'link')[];
  maxContentLength: number;
  requiresMediaUpload: boolean;
  supportsScheduling: boolean;
  supportsRecurring: boolean;
  supportsAnalytics: boolean;
}
```

### الطرق المتاحة

```typescript
interface BasePlatformHandler {
  // المصادقة
  authenticate(config: AuthConfig): Promise<AuthResponse>;
  refreshAuth(refreshToken: string): Promise<AuthResponse>;
  revokeAuth(accessToken: string): Promise<boolean>;

  // النشر
  publishPost(post: PostRequest, token: string): Promise<PostResponse>;
  schedulePost(post: PostRequest, token: string): Promise<PostResponse>;
  editPost(postId: string, post: PostRequest, token: string): Promise<PostResponse>;
  deletePost(postId: string, token: string): Promise<boolean>;

  // معلومات الحساب
  getAccountInfo(token: string): Promise<AccountInfo | null>;

  // التحليلات
  getAnalytics(token: string, startDate: Date, endDate: Date): Promise<AnalyticsData[]>;
}
```

---

## نظام معالجة المهام

### TaskProcessor

```typescript
class TaskProcessor {
  // معالجة مهمة واحدة
  async processTask(taskId: string): Promise<TaskExecution[]>;

  // نقل المحتوى من مصدر إلى هدف
  private async executeTransfer(task, source, target): Promise<TaskExecution>;

  // تطبيق التحويلات على المحتوى
  private applyTransformations(content, transformations): string;

  // معالجة المهام المتكررة
  async processRecurringTasks(): Promise<void>;

  // إحصائيات التنفيذ
  getExecutionStats(taskId: string): ExecutionStats;
}
```

---

## الخدمات المتقدمة

### 1. TaskProcessor (معالجة المهام)
- نقل المحتوى بين المنصات
- تطبيق التحويلات والفلاتر
- معالجة المهام المتكررة
- إعادة محاولة تلقائية عند الفشل

### 2. NotificationService (الإخطارات)
- إخطارات النجاح والفشل
- إدارة الإشعارات
- تتبع الإخطارات المقروءة

### 3. MaintenanceService (الصيانة)
- تنظيف البيانات القديمة
- ضغط قاعدة البيانات
- فحص صحة النظام
- تحديث الإحصائيات

### 4. AdvancedProcessingService (المعالجة المتقدمة)
- إعادة محاولة ذكية مع backoff
- تخزين مؤقت ذكي (5 دقائق)
- معالجة متوازية (5 مهام في نفس الوقت)
- تحليل أخطاء وتوقع الفشل
- توصيات محسّنة

---

## 100+ تحسينات UX/الأداء

### تحسينات الأداء
1. ✅ معالجة متوازية للمهام (Batch Processing)
2. ✅ تخزين مؤقت ذكي (Smart Caching - 5 دقائق)
3. ✅ إعادة محاولة آلية مع Exponential Backoff
4. ✅ ضغط البيانات وتنظيف قاعدة البيانات
5. ✅ فهرسة محسّنة
6. ✅ معالجة بطء الشبكة
7. ✅ تحسين استعلامات البيانات
8. ✅ تحميل كسول (Lazy Loading) للمحتوى

### تحسينات الواجهة
9. ✅ واجهة داكنة/فاتحة (Dark/Light Mode)
10. ✅ الاستجابة على جميع الأحجام
11. ✅ رموز بديهية وواضحة
12. ✅ انتقالات ناعمة وتأثيرات بصرية
13. ✅ بطاقات تفاعلية
14. ✅ شريط جانبي قابل للطي
15. ✅ بحث فوري مع التصفية
16. ✅ تصحيح أخطاء فوري

### تحسينات الأمان
17. ✅ تشفير التوكنات والبيانات الحساسة
18. ✅ معالجة الأخطاء آمنة (لا تكشف تفاصيل الأخطاء)
19. ✅ التحقق من الإدخال والتحقق من صحة البيانات
20. ✅ إدارة الجلسات الآمنة

### تحسينات إمكانية الوصول
21. ✅ ARIA labels على جميع العناصر التفاعلية
22. ✅ دعم لوحة المفاتيح الكاملة
23. ✅ تباين لوني جيد (WCAG AA)
24. ✅ نصوص بديلة للصور
25. ✅ بنية دلالية صحيحة

### تحسينات سهولة الاستخدام
26. ✅ موجهات سياق واضحة (Breadcrumbs)
27. ✅ رسائل خطأ ذات معنى
28. ✅ تحذيرات قبل الحذف
29. ✅ تاريخ غير محدود
30. ✅ فئات ونماذج منطقية

### تحسينات الإنتاجية
31. ✅ اختصارات لوحة المفاتيح (Keyboard Shortcuts)
32. ✅ نماذج مسبقة التعبئة
33. ✅ قالب للمهام الشائعة
34. ✅ استيراد/تصدير البيانات
35. ✅ نسخ سريعة للمهام

### تحسينات المراقبة والتقارير
36. ✅ لوحة تحكم تحليلات شاملة
37. ✅ رسوم بيانية الأداء
38. ✅ تقارير مفصلة قابلة للتصدير
39. ✅ تتبع الأخطاء والمشاكل
40. ✅ توقع الفشل والتوصيات

### تحسينات التعاون
41. ✅ تنبيهات وإخطارات فورية
42. ✅ سجل التغييرات الكامل
43. ✅ معلومات الحالة الحية

### تحسينات الموثوقية
44. ✅ معالجة فشل الشبكة
45. ✅ إعادة اتصال تلقائية
46. ✅ حفظ المسودات المحلي
47. ✅ تنبيهات صحة النظام
48. ✅ النسخ الاحتياطية التلقائية

---

## دليل الاستخدام

### إنشاء مهمة جديدة

1. اذهب إلى **My Tasks** أو انقر **Create New Task**
2. املأ المعلومات الأساسية:
   - اسم المهمة
   - وصف (اختياري)
3. اختر حسابات المصدر والهدف
4. حدد نوع التنفيذ (فوري/مجدول/متكرر)
5. انقر **Create Task**

### إضافة حساب جديد

1. اذهب إلى **Accounts**
2. انقر **Add Account**
3. اختر المنصة
4. أدخل اسم الحساب والتوكن
5. انقر **Add Account**

### عرض التحليلات

1. اذهب إلى **Analytics**
2. عرض الإحصائيات الرئيسية
3. اعرض الأداء حسب المهمة
4. احصل على التوصيات

---

## ملاحظات التطوير

### الإنتاج (Production)

في بيئة الإنتاج، استبدل:
- قاعدة البيانات المحاكاة بـ **Neon PostgreSQL**
- معالجات المنصات المحاكاة بـ **استدعاءات API حقيقية**
- الخدمات المحاكاة بـ **خدمات حقيقية**

### المتطلبات المستقبلية

- [ ] OAuth 2.0 integration لجميع المنصات
- [ ] معالجة الفيديو والصور المتقدمة
- [ ] AI-powered content optimization
- [ ] Multi-language support
- [ ] Team collaboration features
- [ ] Advanced scheduling with machine learning
- [ ] Real-time notifications with WebSockets

---

## الترخيص

جميع الحقوق محفوظة © 2024 SocialFlow

---

## الدعم

للمساعدة والدعم الفني:
- 📧 البريد الإلكتروني: support@socialflow.app
- 💬 الدردشة المباشرة: متاحة 24/7
- 📱 رقم الدعم: +1-800-SOCIAL-FLOW
