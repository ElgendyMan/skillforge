# خريطة عناصر واجهة SkillForge قبل إعادة التنظيم

هذه الخريطة هي baseline قبل refactor. القاعدة: كل عنصر يحتفظ بنفس handler وpath وquery/mutation، والتغيير المسموح هو موضع العرض والتجميع البصري فقط.

## خريطة المسارات والتنقل

| العنصر الحالي | الوظيفة | الأهمية | التصنيف المقترح | مكان العرض الجديد | ضمان الحفاظ |
|---|---|---:|---|---|---|
| لوحة المرشح `/candidate` | ملخص المحاولات والأولوية وآخر المحاولات | أساسي | Primary | ظاهر في القائمة الرئيسية | نفس path وRoleGate |
| اكتشف الاختبارات `/discover` | البحث في الاختبارات وبدء محاولة | أساسي | Primary | ظاهر في القائمة الرئيسية | نفس catalog queries وstart mutation |
| طلباتي `/candidate/status` | متابعة الحالات والنتائج | أساسي | Primary | ظاهر في القائمة الرئيسية | نفس route وquery |
| التنبيهات `/candidate/notifications` | عرض الإشعارات وتعليمها كمقروءة | ثانوي | Account/Updates | مجموعة الحساب/المزيد | نفس notification list وmark mutation |
| ملفاتي المؤمنة `/candidate/files` | فتح ملفات المرشح بروابط مؤقتة | ثانوي | Account/Security | مجموعة الحساب/المزيد | نفس secureAccess |
| ملفي المهني `/candidate/profile` | تعديل ملف المرشح والروابط | ثانوي | Account/Profile | مجموعة الحساب/المزيد | نفس profile save |
| لوحة الشركة `/company` | metrics وأعلى المحاولات وإجراء إنشاء الاختبار | أساسي | Primary | ظاهر في القائمة الرئيسية | نفس dashboard query وCTA |
| اختبار جديد `/company/create-test` | إنشاء اختبار متعدد الأقسام | أساسي | Primary | ظاهر كإجراء بارز | نفس wizard والـ mutations |
| المحاولات `/company/attempts` | فرز ومراجعة محاولات المرشحين | أساسي | Primary | ظاهر في القائمة الرئيسية | نفس filters and review paths |
| مقارنة المرشحين `/company/compare` | اختيار 2–4 ومقارنة وتصدير | أساسي | Primary/Analysis | ظاهر في القائمة الرئيسية | نفس selection/filter/export handlers |
| اختباراتنا `/company/tests` | إدارة اختبارات الشركة | ثانوي | Manage | مجموعة إدارة الشركة | نفس route وactions |
| ملف الشركة `/company/profile` | تعديل بيانات الشركة والشعار | ثانوي | Manage/Profile | مجموعة إدارة الشركة | نفس profile mutations and upload |
| التنبيهات `/company/notifications` | متابعة تحديثات الشركة | ثانوي | Manage/Updates | مجموعة إدارة الشركة | نفس notifications flow |
| ملفات المراجعة `/company/files` | الوصول المؤقت للتسجيلات والأدلة | ثانوي | Manage/Security | مجموعة إدارة الشركة | نفس secure file flow |
| مراجعة محاولة `/company/review/:id` | مراجعة الإجابات والمراقبة والتعليقات | أساسي عند السياق | Contextual | من صف المحاولة أو مجموعة المراجعة | نفس attempt id and review procedures |
| الإشراف `/supervisor` | metrics المنصة | أساسي | Primary | ظاهر | نفس supervisor overview |
| سجل المحاولات `/supervisor/attempts` | متابعة محاولات المنصة | أساسي | Primary | ظاهر | نفس route/query |
| تشغيل محاولة `/attempt/:id` | حل اختبار، مؤقت، autosave، proctoring، submit | أساسي داخل workflow | Contextual | لا يُخفى خلف تنقل عام؛ يدخل من اكتشاف الاختبار أو الصف | نفس TestRunner state |
| صفحة الشركة العامة `/companies/:slug` | عرض الشركة واختباراتها المفتوحة | أساسي عام | Public | نفس public navigation | نفس catalog.companyPage |
| `/` و`/404` | landing/recovery | عام | Public | لا تغيير وظيفي | نفس routes |

## مجموعات العناصر داخل الصفحات

| المجموعة | أمثلة العناصر الحالية | التصنيف | قاعدة التنظيم |
|---|---|---|---|
| إجراءات الصفحة الأساسية | إنشاء، بدء، حفظ، إرسال، تشغيل، معاينة، تصفح | Primary | تبقى في PageHeader أو footer المرئي |
| البحث والفلاتر | search، field/company/level/duration، job title، question type، date range | Primary عند صفحات البيانات | تبقى ظاهرة أو داخل شريط filters قابل للطي على الموبايل، دون فقد state |
| التصدير والمشاركة | CSV، حفظ PDF، أعمدة CSV | Advanced | تجميعها في More/Export group بعد التأكد من بقاء شرط selected rows |
| قوالب المقارنة | حفظ قالب، تطبيق قالب، حذف قالب | Secondary/Advanced | Accordion أو More داخل قسم المقارنة، بنفس mutations |
| المراجعة والتسجيلات | فتح التسجيل، secure access، timeline، integrity indicators | Contextual | تبقى داخل شاشة المراجعة وبالقرب من المحاولة |
| تعليقات الكود | فتح dialog، اختيار سطر، اختيار إجابة، إضافة تعليق، حذف تعليقي، إغلاق | Contextual/Advanced | تبقى داخل dialog واحد من زر تعليقات الكود |
| المحرر | language، theme، autocomplete، run، output/errors، timer، autosave، upload evidence | Primary workflow | لا تُنقل خارج TestRunner؛ يمكن تجميع أدوات المحرر الثانوية بصريًا فقط |
| الحساب | اسم المستخدم، البريد، تسجيل الخروج | Account | داخل trigger حساب ثابت في footer/header |
| التنقل المحمول | SidebarTrigger، القائمة الجانبية، active item | Primary navigation | لا تغيير في المسارات؛ تُحافظ على drawer وEscape |

## حالات يجب الحفاظ عليها

| الحالة | العناصر المتأثرة | شرط عدم الانحدار |
|---|---|---|
| Loading | auth، dashboards، catalog، review details، files | لا يظهر عنصر جديد قبل اكتمال حالته، ولا تُفقد skeletons |
| Empty | لا توجد محاولات/ملفات/نتائج مقارنة | تظل CTA الحالية متاحة |
| Error | catalog، files، mutations، export | تبقى رسائل الخطأ وإعادة المحاولة |
| Disabled/Pending | save، submit، export، comment، start | نفس شروط التعطيل وعدم تكرار mutation |
| Form state | profile، test wizard، comparison filters، code answers | فتح/إغلاق grouping لا يعيد القيم |
| Selection | مقارنة 2–4، أعمدة CSV، line selection | نفس حدود الاختيار وfeedback |
| Role mismatch | كل المسارات المحمية | RoleGate ورسالة الصلاحيات لا تتغير |

## خريطة التغيير المسموح

التغيير المسموح هو إضافة طبقة عرض/تجميع في `PortalShell` و`DashboardLayout` ومكونات UI محلية، مع إبقاء routes وhandlers كما هي. لن تتغير ملفات `server/` أو `drizzle/` أو عقود API. أي عنصر يُنقل إلى Settings/More سيظهر في DOM أو القائمة الفرعية عند فتحها ويملك نفس label وpath والـ action.

## قائمة تحقق بعد التنفيذ

1. كل route أعلاه قابل للوصول.
2. كل عنصر primary ظاهر في السياق الصحيح.
3. كل عنصر secondary/advanced له trigger واضح ومسمى.
4. كل button وdropdown وdialog وfilter وform يحتفظ بنفس الوظيفة.
5. كل state يستمر عند فتح/إغلاق التجميع.
6. desktop/mobile بلا overflow أو تداخل.
7. Playwright يثبت الوصول والتنقل وفتح التجميع وإغلاقه.

## جرد الصفحات والمكونات الكامل

### المكونات المشتركة

| الملف | العناصر والحالات التي تم جردها | الوظيفة المحفوظة |
|---|---|---|
| `DashboardLayout.tsx` | auth loading، شاشة تسجيل الدخول، sidebar، resize handle، mobile trigger، active route، account dropdown، logout | المصادقة والتنقل وتسجيل الخروج كما هي |
| `PortalShell.tsx` | primary role items، مجموعات الحساب/الإدارة، role label، route mapping | نفس المسارات الثلاثة وعزل RoleGate |
| `ErrorBoundary.tsx` | رسالة الخطأ وزر reload | إعادة تحميل الصفحة فقط |
| `AIChatBox.tsx` | prompt shortcuts، textarea، send، loading، history، scroll | إرسال الرسائل والحالة المحلية |
| `ManusDialog.tsx` | login dialog، title، description، login button، close | بدء تسجيل الدخول بنفس callback |
| `DashboardLayoutSkeleton.tsx` | skeleton للـ auth/sidebar/main | حالة تحميل فقط |

### صفحات المرشح والعامة

| الصفحة | controls/states | التصنيف المقترح |
|---|---|---|
| `CandidateDashboard` | CTA استكشف، عرض الكل، صفوف آخر المحاولات، metrics، loading، empty CTA | CTA والصفوف Primary؛ metrics information |
| `Discover`/`DiscoverCatalog` | search input، field/company/level/duration selects، catalog loading/error/empty، start buttons، retry | البحث والفلاتر Primary؛ error/retry محفوظان |
| `CandidateStatus` | attempts table، feedback loading/empty، status badges، published code feedback | عرض أساسي؛ لا controls تُحذف |
| `CandidateProfile` | headline، bio، skills، portfolio inputs، save، saving toast | form أساسي داخل الصفحة؛ state لا يُعاد ضبطه |
| `NotificationsPage` | notification rows، unread/read visual state، mark-read mutation، empty | secondary داخل الحساب لكن rows/actions كما هي |
| `SecureFilesPage` للمرشح | files loading/error/empty، retry، secure temporary access، opening state | secondary/security؛ فتح مؤقت كما هو |
| `CompanyPublicPage` | home/logo، كل الاختبارات، عرض لكل اختبار، external website | public primary؛ لا تغيير |
| `TestRunner` | timer، sections، answers، code editor، language/theme/autocomplete، run/output/errors، autosave، upload evidence، proctoring consent، submit | workflow primary؛ لا ينقل خارج runner |

### صفحات الشركة

| الصفحة | controls/states | التصنيف المقترح |
|---|---|---|
| `CompanyDashboard` | create test CTA، metrics، all attempts، recent attempt rows، review route، empty CTA، loading | create/review Primary؛ metrics information |
| `CompanyTestCreator` | 3-step stepper، title/job title/summary/field/level/duration/proctoring، section inputs، question prompts/guidance/points، MCQ checkbox/options، code starter، add question by all five types، add section، previous/next, publish validation, submit | stepper workflow primary؛ question-type actions grouped inside section but all remain visible/available |
| `CompanyAttempts` | server filters/search/sort/pagination، candidate rows، review links، recordings/proctoring actions، loading/error/empty | search/filter Primary؛ recording/review contextual |
| `CompanyComparison` | selected 0–4 candidates، job title/question type/date filters، clear filters، CSV columns, CSV/PDF export, saved template name/apply/remove/create، comparison cards, notes/tags | candidate selection/filter Primary؛ export/templates advanced group |
| `CompanyTests` | tests list, status/actions, loading/empty | manage secondary group |
| `CompanyProfile` | logo file input, name/description/website/industry, save, public page link, loading | manage/profile group; form state preserved |
| `NotificationsPage` للشركة | rows/read state/mark-read/empty | manage/updates group |
| `SecureFilesPage` للشركة | secure recordings/evidence list, loading/error/empty/retry, temporary open | manage/security group |
| `ReviewAttempt` | answers/score/decision, timeline, integrity flags, recording open, feedback, code comments overlay | contextual review; no relocation of core actions |
| `CodeCommentsOverlay` | open/close, code line selection, answer select, line input, body textarea, add comment, delete own comment, loading/error/toast | advanced contextual group inside review |

### صفحات المشرف

| الصفحة | controls/states | التصنيف المقترح |
|---|---|---|
| `SupervisorDashboard` | overview metrics، سجل المحاولات CTA، loading/empty | primary |
| `SupervisorAttempts` | attempts list، filters/status/organization visibility، detail navigation، loading/error/empty | primary data view |

### حالات عامة وتحقق

تمت مراجعة حالات `loading`, `error`, `empty`, `disabled`, `pending`, `success toast`, `retry`, `selected`, `unread/read`, `open/closed dialog`, `active route`, `mobile drawer`, `role mismatch`, و`form persistence`. أي تجميع جديد يجب أن يغيّر العرض فقط، ولا يغير قيمة state أو owner أو mutation payload.

### التغطية العامة وتجربة المقارنة الفعلية

| السطح | العناصر والحالات التي تم جردها | ضمان الحفاظ |
|---|---|---|
| `/` Home | زر العلامة، روابط الاختبارات والأقسام، تسجيل الدخول أو فتح المساحة، اكتشاف الاختبارات، إنشاء الحساب، hero، preview، capability/integrity sections، footer، RTL/responsive | نفس workspace target وstartLogin وpaths العامة |
| NotFound | زر الرئيسية، زر الرجوع history، رسالة 404، recovery card، overflow protection | نفس escape routes وحالة المسار غير الموجود |
| ComponentShowcase | theme toggle، buttons، forms، checkbox/switch/radio/slider/OTP، dates، combobox، pagination/table، menus، tabs/accordion/collapsible، dialogs/drawer/sheet/popover/tooltip، calendar/carousel/toggle/resizable، toasts وAIChatBox demo | صفحة عرض معزولة؛ تظل حالات العرض المحلية كما هي |
| `/company/compare` الفعلية | export CSV/PDF، columns selector، filters قابلة للطي، dates/job/question، reset، templates، اختيار 2–4، notes/tags، save loading/error | نفس queryInput وmutations وselection limits؛ التغيير بصري فقط |
| Company test builder | stepper، required validation، previous/next، publish، add section، add-question menu لكل multiple choice/essay/code/vulnerability/file upload، question fields | كل type ما زال يستدعي `addQuestion` الأصلي؛ التجميع لا يغير draft state |
