# SkillForge

منصة توظيف تقنية تعتمد على اختبارات عملية قابلة للمراجعة، وتفصل بوضوح بين مساحات المرشح والشركة والمشرف.

SkillForge supports technical hiring workflows for multiple assessment types: multiple-choice, essay, code, vulnerability analysis, and file submissions. Candidates receive a snapshot-stable assessment experience, companies review submissions and feedback, and supervisors handle security and operational review.

## أهم المزايا

- مساحات وصلاحيات منفصلة للمرشح والشركة والمشرف.
- اختبارات بأسئلة اختيار من متعدد، مقالية، برمجية، تحليل ثغرات، ورفع ملفات.
- حفظ تلقائي للإجابات، مؤقت، إيقاف بسبب مشكلة تقنية، واعتراضات.
- snapshot للأسئلة عند بدء المحاولة حتى لا تتغير تجربة المرشح أثناء الحل.
- مراجعة بشرية، درجات، حالات قبول/رفض، ملاحظات على أسطر الكود، وإشعارات.
- تسجيلات proctoring بموافقة صريحة وحالة quarantine للملفات قبل الوصول الموقّع.
- واجهة RTL متجاوبة مع حالات تحميل واسترداد واضحة.
- تدفق MySQL/TiDB عبر Drizzle ORM مع migrations قابلة للتتبع.

## المتطلبات

- Node.js 20 أو أحدث.
- pnpm 10.
- MySQL أو TiDB عند تشغيل خصائص قاعدة البيانات.
- متغيرات البيئة الموجودة في [`ENVIRONMENT_VARIABLES.example`](./ENVIRONMENT_VARIABLES.example).

## التشغيل المحلي

```bash
pnpm install --frozen-lockfile
cp ENVIRONMENT_VARIABLES.example .env
# ضع القيم الحقيقية في secret manager أو ملف .env المحلي فقط
pnpm check
pnpm test
pnpm build
pnpm dev
```

يفتح الخادم عادةً على `http://localhost:3000`.

## أوامر التحقق

```bash
pnpm check          # TypeScript
pnpm test           # Vitest
pnpm test:e2e       # Playwright
pnpm build          # Production build + chunk assertions
pnpm audit:prod     # فحص الاعتمادات الإنتاجية
```

تشغّل GitHub Actions هذه الفحوص تلقائياً عند كل push وPull Request. اختبارات المتصفح تستخدم mock authentication development-only؛ لا تستخدم هذا المسار في الإنتاج.

## تدفق قاعدة البيانات

المخطط المصدر موجود في [`drizzle/schema.ts`](./drizzle/schema.ts)، وملفات migrations في [`drizzle/`](./drizzle/). يستخدم التطبيق استعلامات parameterized عبر Drizzle، وعزل الصلاحيات يتم في server procedures قبل قراءة أو تعديل بيانات المحاولة والشركة والملفات.

عند تشغيل migrations في بيئة مهيأة:

```bash
pnpm db:push
```

يجب تنفيذ migrations من خلال pipeline أو release process موثوق، مع backup قبل أي تغيير schema. لا تضع `DATABASE_URL` أو مفاتيح التخزين أو OAuth في GitHub أو داخل الكود؛ استخدم GitHub Secrets أو مزود secrets خارجي.

## الأمان والخصوصية

- لا يعتبر proctoring دليلاً مستقلاً على الغش ولا يقرر القبول وحده.
- التسجيلات وملفات المرشحين تحتاج موافقة وسياسة احتفاظ وحذف lifecycle في بيئة الإنتاج.
- تشغيل الأكواد المعزول فعلياً وmalware scanning يجب توصيلهما بمزود إنتاجي قبل استخدام المنصة في توظيف حقيقي.
- راجع [`docs/fairness-privacy-production.md`](./docs/fairness-privacy-production.md) و[`LOVABLE_MIGRATION.md`](./LOVABLE_MIGRATION.md) قبل النشر.
- للإبلاغ عن ثغرة، راجع [`SECURITY.md`](./SECURITY.md).

## بنية المشروع

```text
client/       React + Vite + Tailwind frontend
server/       Express + tRPC API and authorization
server/routers/ Domain routers for hiring and review tools
drizzle/      MySQL schema and migrations
e2e/          Playwright role and UI regression tests
scripts/      Export, seed, build assertions, and red-team checks
docs/         Privacy, fairness, and production notes
```

## الحالة الحالية

المشروع في مرحلة production hardening وليس اعتماداً إنتاجياً نهائياً. تم اختبار عزل الأدوار، recovery states، responsive behavior، وnegative paths. قبل استقبال بيانات حقيقية يجب إكمال sandbox لتشغيل الكود، malware scanning، lifecycle deletion، وتكامل البريد وATS المطلوبين.

## الترخيص

MIT — راجع [`LICENSE`](./LICENSE).
