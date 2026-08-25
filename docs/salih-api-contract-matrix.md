# مصفوفة عقود salih-ai والخلفية

## نطاق المراجعة

اعتُمد الملف الحالي `client/src/services/api.ts` من فرع `main` في مستودع `salih-ai` كمرجع API. تطابق blob المحلي مع GitHub في وقت المراجعة، ويعرّف الملف فعلياً وحدتين فقط هما **`api.dashboard`** و**`api.platform`**. تُسجّل الدوال التي تظهر في صفحات `client/src` ولكن لا توجد في هذا الملف كعقود واجهة غير مكتملة؛ لا تُحوّل تلقائياً إلى endpoints جديدة.

> المعيار: **Matched** يعني أن method ومسار الخلفية والحماية متوافقة. **Broken** يعني أن المسار أو الحمولة موجودة لكن السلوك الحالي لا يفي بالعقد. **Missing Backend Contract** يعني أنه لا توجد route فعالة تحقق method المعروضة. **Undefined Frontend Method** يعني أن الصفحة تستدعي method لا يعرّفها `api.ts` المرجعي.

## الوحدات في المرجع واستعمالها

| الوحدة | موجودة في `api.ts` | الدوال المعرّفة | استعمالات `client/src` الملحوظة | الحالة |
|---|---:|---|---|---|
| `api.dashboard` | نعم | `stats`, `leads`, `calls`, `conversations`, `properties`, `agents`, `company` | تستعمل الصفحات أيضاً `api.dashboard.agent` بالمفرد | موجودة جزئياً؛ `agent` غير معرّفة في المرجع. |
| `api.platform` | نعم | `companies.list/details/activate/suspend`, `requests.list/approve/reject` | تستدعي صفحة أخرى `api.platform.dashboard` | موجودة جزئياً؛ `dashboard` غير معرّفة في المرجع. |
| `api.auth` | لا | — | `useAuth` يستعملها اختيارياً | **Undefined Frontend Method**؛ المصادقة المرجعية في `services/auth.ts`. |
| `api.crm` | لا | — | `conversations`, `messages` | **Undefined Frontend Method**. |
| `api.agents` | لا | — | `list`, `create`, `update`, `delete` | **Undefined Frontend Method**. |
| `api.ai` | لا | — | `chat` | **Undefined Frontend Method**. |
| `api.knowledge` | لا | — | `list`, `delete` | **Undefined Frontend Method**. |
| `api.reports` | لا | — | `list`, `download` | **Undefined Frontend Method**. |
| `api.settings` | لا | — | `get`, `update`, `password` | **Undefined Frontend Method**. |
| `api.team` | لا | — | `list` | **Undefined Frontend Method**. |
| `api.websites` | لا | — | `list` | **Undefined Frontend Method**. |

## عقود Frontend إلى Backend

| Frontend function أو الطلب | HTTP method | Backend route الفعلية | Authorization | Tenant | Status |
|---|---|---|---|---|---|
| `startLogin(email,password)` | `POST` | `/auth/login` | عام | لا | **Matched**؛ يعيد token و`next_step` وuser. |
| `getMe()` | `GET` | `/auth/me` | Bearer JWT | لا | **Matched** بصورة أساسية؛ يعيد `{ user }` فقط. |
| `logout()` | `POST` | `/auth/logout` | لا يلزم | لا | **Matched**. |
| إنشاء الشركة المباشر | `POST` | `/company/register` | عام | لا | **Matched**؛ الحقول المرجعية مدعومة. |
| طلب شركة لحساب قائم | `POST` | `/company/request` | Bearer JWT | من claim | **Matched**؛ يدعم `company_name`, `website`, `document_url`. |
| `api.dashboard.stats()` | `GET` | `/api/dashboard/stats` | Bearer JWT من login | مطلوب | **Matched** بعد توحيد middleware مع JWT الصادر من `/auth/login`. |
| `api.dashboard.leads()` | `GET` | `/api/dashboard/leads` | Bearer JWT من login | مطلوب | **Matched** بعد توحيد middleware. |
| `api.dashboard.calls()` | `GET` | `/api/dashboard/calls` | Bearer JWT من login | مطلوب | **Matched** بعد توحيد middleware. |
| `api.dashboard.conversations()` | `GET` | `/api/dashboard/conversations` | Bearer JWT من login | مطلوب | **Matched** بعد توحيد middleware. |
| `api.dashboard.properties()` | `GET` | `/api/dashboard/properties` | Bearer JWT من login | مطلوب | **Matched** بعد توحيد middleware. |
| `api.dashboard.agents()` | `GET` | `/api/dashboard/ai-agent` | Bearer JWT من login | مطلوب | **Matched** بعد توحيد middleware. |
| `api.dashboard.agent()` | `GET` | `/api/dashboard/agent` | Bearer JWT من login | مطلوب | **Matched**؛ method وroute alias موثقان ومختبران. |
| `api.dashboard.company()` | `GET` | `/api/dashboard/company` | Bearer JWT من login | مطلوب | **Matched** بعد توحيد middleware. |
| `api.platform.requests.list()` | `GET` | `/platform/company-requests` | Platform Owner JWT | لا | **Matched**؛ alias يحافظ على `/api/platform`. |
| `api.platform.requests.approve(id)` | `PATCH` | `/platform/company-requests/:id/approve` | Platform Owner JWT | لا | **Matched**؛ alias موثق ومختبر. |
| `api.platform.requests.reject(id)` | `PATCH` | `/platform/company-requests/:id/reject` | Platform Owner JWT | لا | **Matched**. |
| `api.platform.companies.list()` | `GET` | لا يوجد | — | — | **Missing Backend Contract**. |
| `api.platform.companies.details(id)` | `GET` | لا يوجد | — | — | **Missing Backend Contract**؛ الواجهة تتوقع counts وخطة. |
| `api.platform.companies.activate(id)` | `PATCH` | لا يوجد | — | — | **Missing Backend Contract**. |
| `api.platform.companies.suspend(id)` | `PATCH` | لا يوجد | — | — | **Missing Backend Contract**. |
| استعمال `api.platform.dashboard()` | غير محدد | `/api/dashboard/` يعيد نوع dashboard فقط | لا يوجد عقد متوافق | — | **Broken**؛ method غير معرّفة والـroute لا تعيد إحصاءات المنصة المتوقعة. |
| استعمال `api.crm.conversations/messages` | غير محدد | لا يوجد مطابق؛ المتاح `/crm/note` فقط | JWT مخصص | مطلوب | **Missing Backend Contract** مع **Undefined Frontend Method**. |
| استعمال `api.agents.{list,create,update,delete}` | غير محدد | لا يوجد CRUD وكيل؛ المتاح ملخص dashboard | — | — | **Missing Backend Contract** مع **Undefined Frontend Method**. |
| استعمال `api.ai.chat` | غير محدد | المتاح `POST /ai_gateway/` فقط | حل tenant مختلف | غير مؤكد | **Missing Backend Contract**؛ لا دليل أنه يقبل عقد chat/thread الواجهة. |
| استعمال `api.knowledge.list/delete` | غير محدد | المتاح upload معرفة فقط | JWT مخصص | مطلوب | **Missing Backend Contract** مع **Undefined Frontend Method**. |
| استعمال `api.reports.list/download` | غير محدد | لا توجد route reports فعالة | — | — | **Missing Backend Contract** مع **Undefined Frontend Method**. |
| استعمال `api.settings.get/update/password` | غير محدد | المتاح قراءة `/api/dashboard/company` فقط | Bearer token | مطلوب | **Missing Backend Contract** مع **Undefined Frontend Method**. |
| استعمال `api.team.list` | غير محدد | لا توجد route team فعالة | — | — | **Missing Backend Contract** مع **Undefined Frontend Method**. |
| استعمال `api.websites.list` | غير محدد | المتاح `GET /website/:tenant_id` | JWT مخصص | مطلوب | **Broken**؛ الواجهة تتوقع list ولا توفر tenant id، والخلفية تعيد كائناً واحداً. |

## RBAC والعزل متعدد الشركات

| المجال | سياسة الواجهة | حماية الخلفية الفعلية | التقييم |
|---|---|---|---|
| Platform requests | `platform_owner` فقط | `platformAuth` يفحص `role` أو `is_platform_owner` | **متوافق**. |
| Company dashboard وCRM والقوائم | `owner`, `admin`, `manager`, `agent` | routes dashboard تتحقق من هوية Supabase وtenant فقط، ولا تفرض role | العزل مطلوب عند نجاح middleware؛ صلاحيات server-side الدقيقة غير مفروضة. |
| Agents وKnowledge وReports وWebsite | الواجهة تمنع `agent` وتسمح owner/admin/manager حسب الصفحة | لا توجد عقود CRUD/قراءة متطابقة لتقييمها؛ routes website الموجودة تتحقق من tenant فقط | **مشكلة RBAC**: لا يمكن الاعتماد على حماية الواجهة وحدها. |
| Team وSettings | الواجهة تسمح owner/admin فقط | لا توجد route متطابقة | **Missing Backend Contract** وRBAC غير قابل للتحقق. |
| CRM note وWebsite management | غير مرتبط مباشرة بـAPI methods المرجعية | `authenticateRequest` و`requireTenantIdentity` وملكية المورد لمسارات محمية | عزل tenant متحقق للمسارات المقروءة، من دون أدوار دقيقة. |

## قائمة Backend routes الفعالة

| Prefix | المسارات الفعالة |
|---|---|
| `/` | `GET /` health. |
| `/auth` | `POST /login`, `GET /me`, `POST /logout`. |
| `/api/dashboard` | `GET /stats`, `/leads`, `/calls`, `/conversations`, `/properties`, `/ai-agent`, `/agent`, `/company`، إضافة إلى `GET /` القديم لتوجيه النوع. |
| `/api/platform` و`/platform` | `GET /company-requests`, `POST /create-company`, `PATCH /company-requests/:id/approve`, `PATCH /company-requests/:id/reject`. |
| `/company` | `POST /register`, `POST /request`, `POST /upload-document`. |
| `/crm` | `POST /note`. |
| `/ai_gateway` | `POST /`. |
| قنوات الاتصال | `POST /whatsapp/`, `GET/POST /meta/webhook`, `POST /email/webhook`, `POST /vapi/`. |
| `/website` | ingest، create، tenant read، template/publish، leads، AI generation، content/design، orders، generator؛ وتُركّب أقسام website تحت prefixes المخصصة في `index.js`. |
| مسارات المنصة الخاصة بالموقع | templates وsections تحت `/api/platform/website/*`، والـrender تحت `/api/render/website/*`. |
| أخرى | invitations، company upload، public website render، website orders، scheduler/health. |

## التعديلات المؤكدة المقترحة

الأدلة كفت لثلاثة تعديلات فقط في هذه الجولة: توحيد middleware مسارات dashboard مع JWT الصادر من `/auth/login`، وإضافة `api.dashboard.agent()` كـalias يستدعي route الموجودة فعلاً، وإضافة `api.auth.me/logout` للعقود الخلفية الموجودة كي تعمل الاستدعاءات الاختيارية في `useAuth`. أما CRUD للشركات أو CRM أو agents أو AI chat أو team أو reports أو settings أو websites فلا يملك `api.ts` المرجعي method أو route خلفية متطابقة ومثبتة في الوقت نفسه؛ لذلك لا يجوز إنشاؤه تخميناً.

## التحقق

نجحت مجموعة backend كاملة بعد التعديلات: **72/72**. كما نجح اختبار HTTP لمسار dashboard agent باستخدام JWT يحمل `id` و`auth_user_id` و`tenant_id`، ويؤكد عدم الحاجة إلى Supabase access token. أُصلحت بيئة Vitest المرجعية في فرع salih-ai (تبعيات الاختبار ومسارات root)، ثم نجح اختبار `api.ts`: **2/2**.

يبقى فحص TypeScript العام لواجهة salih-ai مانعاً للدمج: انتهى `npm run check` برمز خروج 1 و**1843** رسالة TypeScript في بيئة Node 22، بينما يعلن المشروع طلب Node 24. تتضمن النتائج المتبقية methods واجهة غير معرفة مثل `agents`, `crm`, `ai`, `knowledge`, `reports`, `settings`, `team`, و`websites`، إضافة إلى مشكلات إعدادات وأنواع موروثة. لا يوجد دليل تكامل حي مع Railway لأن فرع الخلفية لم يُنشر إلى staging مستقل؛ لذلك قرار الدمج إلى `main` هو **غير جاهز** رغم نجاح اختبارات العقود المؤكدة.

# MISSING FRONTEND CONTRACTS

## دليل المصدر الموثوق

الفروع البعيدة المتاحة في مستودع `salih-ai` هي `main` و`security/phase-2-hardening` فقط. لا تعرّف نسخة `main` الحالية وحدات `api.crm` أو `api.agents` أو `api.ai`. عُثر على أحدث نسخة تاريخية موثقة تجمع الوحدات الثلاث في commit `170dfa2de454b98afd4675e599cb16e8ec821aee` بتاريخ 2026-07-15، وهو ancestor مثبت لفرع `main`. هذا الدليل يحدد routes التاريخية فقط؛ لا يبرر إعادة إضافتها إلى الواجهة أو الخلفية.

| الوحدة | Frontend caller الحالي | Expected API method من المصدر الموثوق | Backend route إن وجد | HTTP method | Auth requirement | Role requirement | Tenant requirement | Evidence/source | Status |
|---|---|---|---|---|---|---|---|---|---|
| CRM | `client/src/pages/Conversations.tsx` | `api.crm.conversations()` → `/crm/conversations` | لا يوجد؛ المتاح فقط `/crm/note` | `GET` | Bearer بحسب request التاريخي | غير معرّف في method التاريخية؛ الواجهة تقصر صفحة المحادثات على أدوار الشركة | متوقع من السياق؛ route غير موجودة | commit `170dfa2`، caller السطر 141، و`scr/routes/crm.js` | **MISSING** |
| CRM | `client/src/pages/Conversations.tsx` | `api.crm.messages(...)` → `/crm/messages` | لا يوجد؛ المتاح فقط `/crm/note` | `GET` في المصدر التاريخي | Bearer بحسب request التاريخي | غير معرّف في method التاريخية | متوقع من السياق؛ route غير موجودة | commit `170dfa2`، caller السطر 188 يمرر `conversation_id` بينما method التاريخية لا تقبل وسيطاً | **MISSING** |
| Agents | `client/src/pages/Agents.tsx` | `api.agents.list()` → `/agents` | لا يوجد | `GET` | Bearer بحسب request التاريخي | غير معرّف في method التاريخية | متوقع من السياق؛ route غير موجودة | commit `170dfa2`، caller السطر 110، وجرد مسارات الخلفية | **MISSING** |
| Agents | `client/src/pages/Agents.tsx` | `api.agents.create(data)` → `/agents` | لا يوجد | `POST` | Bearer بحسب request التاريخي | غير معرّف في method التاريخية | متوقع من السياق؛ route غير موجودة | commit `170dfa2`، caller السطر 264 | **MISSING** |
| Agents | `client/src/pages/Agents.tsx` | `api.agents.update(id,data)` → `/agents/:id` | لا يوجد | `PUT` | Bearer بحسب request التاريخي | غير معرّف في method التاريخية | متوقع من السياق؛ route غير موجودة | commit `170dfa2`، callers 234 و335 | **MISSING** |
| Agents | `client/src/pages/Agents.tsx` | `api.agents.delete(id)` → `/agents/:id` | لا يوجد | `DELETE` | Bearer بحسب request التاريخي | غير معرّف في method التاريخية | متوقع من السياق؛ route غير موجودة | commit `170dfa2`، caller السطر 398 | **MISSING** |
| Agents | لا يوجد caller حالي لهذا method | `api.agents.toggleStatus(id,status)` → `/agents/:id/status` | لا يوجد | `PATCH` | Bearer بحسب request التاريخي | غير معرّف في method التاريخية | متوقع من السياق؛ route غير موجودة | commit `170dfa2` | **MISSING** |
| AI | `client/src/pages/Conversations.tsx` | `api.ai.chat(data)` → `/ai_gateway/chat` | لا يوجد؛ المتاح `POST /ai_gateway/` فقط | `POST` | Bearer بحسب request التاريخي | غير معرّف في method التاريخية | backend الفعلي يحل tenant من هوية قناة خارجية، لا من Bearer | commit `170dfa2`، caller السطر 281، و`scr/routes/ai_gateway.js` | **BROKEN** |
| AI | لا يوجد caller حالي لهذا method | `api.ai.ask(data)` → `/ai_gateway` | `POST /ai_gateway/` موجود | `POST` | request التاريخي يرسل Bearer، لكن backend لا يستهلكه | غير معرّف في method التاريخية | backend يتطلب assistant/channel identity؛ لا يكفي tenant المستخدم | commit `170dfa2` و`resolveTenant.js` | **PARTIAL** |

لا توجد صفوف CRM أو Agents أو AI بحالة **MATCHED**. لم تُنشأ routes أو methods اعتماداً على هذا التاريخ؛ يظل التقرير دليلاً لتقرير لاحق فقط بعد تثبيت عقد حالي معتمد ومحدد الصلاحيات والعزل.
