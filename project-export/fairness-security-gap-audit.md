# SkillForge — Fairness, Privacy, and Security Gap Audit

## نطاق المراجعة

هذه المراجعة تقارن المواصفات المرفقة بالحالة الفعلية للكود الحالي، ولا تعتبر mock workspaces أو لقطات الواجهة دليلًا على جاهزية تشغيل proctoring أو code execution في الإنتاج. تمت مراجعة `drizzle/schema.ts` و`server/routers.ts` و`server/routers/hiring.ts`، مع الاستفادة من اختبارات العزل الحالية وخريطة عناصر الواجهة.

## ما هو منفذ ومختبر حاليًا

| المجال | الحالة الحالية | الدليل |
|---|---|---|
| Manus OAuth والمصادقة | منفذ؛ المسار الإنتاجي موجود، وmock auth محصور بالتطوير | `server/_core/context.ts`, `server/_core/mockAuth.ts` |
| الأدوار الأساسية | منفذة ومختبرة: candidate/company/supervisor مع ownership checks رئيسية | `server/routers/hiring.ts`, `server/mockDataIsolation.test.ts` |
| test types | منفذة في الـwizard والـschema: MCQ/essay/code/vulnerability/file upload | `drizzle/schema.ts`, `client/src/pages/Platform.tsx` |
| candidate question payload | الإجابات الصحيحة وevaluation guide لا تُرسل في `candidate.attempts.get` | `server/routers/hiring.ts:179-188` |
| proctoring consent | يوجد تحقق من consent قبل بدء session | `server/routers/hiring.ts:386-396` |
| signed file access | يوجد signed download مع فحص owner/company member/supervisor | `server/routers/hiring.ts:448-460` |
| company review | المراجعة البشرية موجودة كإجراء company-only ومختبرة بعزل أساسي | `server/routers/hiring.ts:351-368` |
| UI regression | Playwright يغطي المسارات، التنقل، الفلاتر، dialogs، exports، وmock workspaces | `e2e/*.spec.ts` |

## فجوات عالية الخطورة تحتاج إصلاحًا أو قرارًا صريحًا

| المجال | الفجوة الفعلية | الأثر | المعالجة المقترحة |
|---|---|---|---|
| حالات المحاولة | `testAttempts.state` حاليًا `in_progress/submitted` فقط؛ لا يوجد paused technical issue أو expired منفصل أو server-side grace policy | لا يمكن تمثيل الانقطاع والمهلة والإنصاف بدقة | إضافة حالات انتقال مقيدة واختبارات race/expiry/technical issue |
| قرار التوظيف | `company.attempts.review` يكتب `accepted/rejected` مباشرة في `applicationStatus`؛ لا يوجد rationale إلزامي أو appeal/decision history | القرار غير قابل للتدقيق بما يكفي ولا يفصل review عن hiring decision | إضافة reason/reference/audit وسجل قرارات مستقل أو boundary واضح يمنع الانتقال الآلي |
| scoring/priority | `priorityScore` يُحسب من score و`integrityFlags`؛ proctoring event يزيد flags تلقائيًا | قد يبدو كأنه عقوبة أو ترتيب آلي؛ لا يحقق قاعدة «signal ليس دليلًا» | إزالة أثر signal على قرار/ترتيب التوظيف، وعرضه كـtechnical context فقط مع limitation |
| versioning | `tests`, `testSections`, `testQuestions` تُكتب مباشرة بلا version tables أو snapshot reference | تعديل لاحق قد لا يكون immutable ولا يثبت نسخة السؤال المستخدمة | إضافة version records أو منع التعديل بعد publish/assignment مع اختبارات |
| question bank | لا يوجد question bank company-scoped أو tags/source/license/exposure/retirement | لا توجد دورة حياة ومراجعة للأسئلة | إضافة model/API تدريجيًا أو توثيق عدم الدعم قبل الادعاء به |
| candidate rights | لا يوجد model/API واضح لـappeals أو accommodations أو data export/correction/delete | حقوق المرشح غير قابلة للتنفيذ داخل المنصة | إضافة minimum viable technical issue/appeal/accommodation flows وسياسة واضحة |
| proctoring privacy | consent/session/events موجودة، لكن لا يوجد retention/access audit/alternative assessment؛ events تزيد flags | خطر تفسير signal كغش وعدم وضوح الاحتفاظ | فصل technical signals، إضافة retention metadata وaudit access ورسائل privacy |
| file security | upload يقبل base64 وmime من العميل؛ لا magic-byte/hash/quarantine/retention، و`secureAccess` لا يسجل access audit | الملفات قد تُقبل بنوع غير حقيقي ولا توجد دورة احتفاظ قابلة للتدقيق | تحقق server-side من النوع والحجم والhash، رفض الأنواع الخطرة، audit وexpiry metadata |
| notifications | قائمة داخلية وعناوين عامة موجودة، لكن email preview/privacy policy وdurable retry ليست كاملة | احتمال كشف معلومات أكثر من اللازم أو ادعاء delivery غير مثبت | قوالب عامة، delivery state صريح، idempotency/retry policy موثقة |
| exports/comparison | المقارنة تعرض أفرادًا و`priorityScore`/status؛ exports موجودة | قد تتحول إلى ranking أو employability signal | إعادة تسمية وشرح aggregate/decision-support، وإخفاء priority كترتيب عام إن لزم |
| audit | جدول `auditLogs` موجود لكن استعماله لا يغطي كل الأحداث المطلوبة | لا توجد trace كاملة للنشر/الوصول/القرار/التصدير | helper موحد للأحداث الحساسة واختبارات وجوده؛ لا نسميه tamper-proof بلا signing |
| code runner | واجهة التشغيل موجودة لكنها provider/sandbox-dependent؛ لا دليل في هذا المشروع على worker isolated production | ادعاء تشغيل آمن سيكون مضللًا | state `not_configured` عند غياب sandbox، وعدم تنفيذ submission داخل web server |

## تصنيف الميزات حسب الدليل الحالي

| التصنيف | أمثلة |
|---|---|
| منفذ ومختبر | RBAC الأساسي، company ownership، candidate ownership، RoleGate، signed access الأساسي، UI workflows |
| واجهة و/أو mock | mock role sessions، seeded workspaces، بعض code-runner interaction states |
| يحتاج provider/config خارجي | Resend delivery، storage guarantees beyond signed URLs، live notification delivery |
| يحتاج sandbox حقيقي | code execution submissions مع isolation وresource limits |
| يحتاج اختبار جهاز/مستخدم حقيقي | camera/screen permissions، browser crash/network interruption، accessibility assistive technology |
| غير منفذ كنموذج مستقل | applications، test/question versions، question bank، appeals، accommodations، retention records، audit event taxonomy الموسع |

## قواعد عدم الادعاء

لا ينبغي للواجهة أو التقرير استخدام عبارات مثل «كشف الغش» أو «ملاءمة المرشح» أو «قرار آلي» أو «Production Ready» لهذه الأجزاء قبل وجود boundary server-side واختبار مناسب ومراجعة بشرية. الدرجة، priority الحالية، وأحداث proctoring يجب أن تظهر كأدوات مساعدة وسياق تقني فقط، لا كحكم على الشخصية أو النية أو الصدق.

## ترتيب الإصلاح

1. فصل `integrityFlags` و`priorityScore` عن أي إيحاء بقرار توظيف آلي، وإجبار القرار البشري على rationale وتسجيل audit.
2. إضافة attempt state للـtechnical issue والـexpiry مع server authority واختبارات race.
3. منع تعديل الاختبار المنشور بصمت عبر version/snapshot boundary.
4. تقوية upload/access audit وretention metadata قبل توسيع proctoring.
5. إضافة candidate-facing explanation وappeal/accommodation/retention guidance.
6. جعل code runner وResend وميزات proctoring تعرض حالة الإعداد الحقيقية بدل ادعاء تشغيل إنتاجي.
