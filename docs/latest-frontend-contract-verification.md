# Latest Frontend Contract Verification

## قرار المرجع

المرجع الرسمي الوحيد لهذه المراجعة هو فرع `main` في مستودع `salih-ai`. آخر commit للواجهة هو [`3e941ee`](https://github.com/ibrahim0908780850-code/salih-ai/commit/3e941eea4f10768b0fd93396d51dacf696935ece) بتاريخ 2026-08-17، وآخر تعديل لملف `client/src/services/api.ts` على `main` هو [`f1f0983`](https://github.com/ibrahim0908780850-code/salih-ai/commit/f1f0983840a3d1d73e69c70c15f5ae60baf715ca) بتاريخ 2026-08-07. الفروع البعيدة المتاحة عند التحقق هي `main` و`security/phase-2-hardening` فقط، ولم توجد Pull Requests مفتوحة أو مغلقة في المستودع تشرح عقداً أحدث.

يظل commit [`170dfa2`](https://github.com/ibrahim0908780850-code/salih-ai/commit/170dfa2de454b98afd4675e599cb16e8ec821aee) بتاريخ 2026-07-15 **REFERENCE BASELINE** تاريخياً فقط. هو ancestor مثبت لـ`main`، لكنه ليس Official Contract ولا يبرر إضافة methods أو routes أو تغيير سلوك حالياً.

## أحدث `api.ts` متحقق منه

تعرّف نسخة `api.ts` في [`f1f0983`](https://github.com/ibrahim0908780850-code/blob/f1f0983840a3d1d73e69c70c15f5ae60baf715ca/client/src/services/api.ts) وحدتي `dashboard` و`platform` فقط؛ لا توجد definitions بالاسم `api.crm` أو`api.agents` أو`api.ai`. ومع ذلك تستدعي صفحات المصدر الحالية هذه الأسماء، وهو تعارض مصدر واجهة لا يجوز حله بتخمين API.

| الوحدة | Latest frontend callers | تعريف في أحدث `api.ts` | الحالة النهائية |
|---|---|---|---|
| CRM | `Conversations.tsx`: `api.crm.conversations`, `api.crm.messages` | غير موجود | **Contract Unresolved** |
| Agents | `Agents.tsx`: `list`, `create`, `update`, `delete` | غير موجود | **Contract Unresolved** |
| AI | `Conversations.tsx`: `api.ai.chat` | غير موجود | **Contract Unresolved** |

## مطابقة الخلفية الحالية

| الوحدة | Expected API method | Backend route الحالي | HTTP | Auth / Role / Tenant | التصنيف | الدليل |
|---|---|---|---|---|---|---|
| CRM | `api.crm.conversations` | لا يوجد؛ المتاح فقط `/crm/note` | `POST` للـnote فقط | JWT مخصص، tenant مطلوب، ولا توجد role policy دقيقة | **MISSING** | [caller](https://github.com/ibrahim0908780850-code/salih-ai/blob/main/client/src/pages/Conversations.tsx)، [backend](https://github.com/ibrahim0908780850-code/vapi-voice-agent/blob/security/phase-2-hardening/scr/routes/crm.js) |
| CRM | `api.crm.messages` | لا يوجد؛ المتاح فقط `/crm/note` | `POST` للـnote فقط | JWT مخصص، tenant مطلوب، ولا توجد role policy دقيقة | **MISSING** | المصدران نفسيهما أعلاه؛ لا يوجد contract حديث يعرّف request أو response. |
| Agents | `api.agents.list/create/update/delete` | لا يوجد `/agents` CRUD؛ المتاح فقط عرض dashboard `/api/dashboard/ai-agent` | `GET` للعرض فقط | JWT مخصص وtenant مطلوب لمسار dashboard؛ لا policy role دقيقة | **MISSING** | [caller](https://github.com/ibrahim0908780850-code/salih-ai/blob/main/client/src/pages/Agents.tsx)، [dashboard router](https://github.com/ibrahim0908780850-code/vapi-voice-agent/blob/security/phase-2-hardening/scr/routes/dashboard.api.js) |
| AI | `api.ai.chat` | لا يوجد `/ai_gateway/chat`؛ المتاح `POST /ai_gateway/` | `POST` | لا يستهلك route الـBearer المستخدم في العقد التاريخي؛ يحدد tenant من هوية قناة خارجية | **BROKEN** كمسار مطابق؛ حالة الوحدة العامة **Contract Unresolved** | [caller](https://github.com/ibrahim0908780850-code/blob/main/client/src/pages/Conversations.tsx)، [gateway](https://github.com/ibrahim0908780850-code/vapi-voice-agent/blob/security/phase-2-hardening/scr/routes/ai_gateway.js)، [tenant resolver](https://github.com/ibrahim0908780850-code/vapi-voice-agent/blob/security/phase-2-hardening/scr/utils/resolveTenant.js) |

لا توجد نتائج **MATCHED** أو **PARTIAL** يمكن اعتمادها للوحدات الثلاث في أحدث عقد واجهة. التصنيفات **MISSING** و**BROKEN** تشرح route-level evidence فقط، ولا تتحول إلى موافقة على التطوير.

## نتيجة التشغيل

لا تُنفذ أي تغييرات وظيفية جديدة على CRM أو Agents أو AI. لا تُضاف routes أو methods تخمينية. لا يُدمج أي فرع إلى `main`. يلزم قبل أي تطوير لاحق تقديم عقد حديث معتمد يحدد لكل وحدة: request/response schema، method، endpoint، auth، role policy، وtenant policy.

## References

1. [آخر commit موثق للواجهة — GitHub](https://github.com/ibrahim0908780850-code/salih-ai/commit/3e941eea4f10768b0fd93396d51dacf696935ece)
2. [آخر تعديل موثق لـ api.ts — GitHub](https://github.com/ibrahim0908780850-code/salih-ai/commit/f1f0983840a3d1d73e69c70c15f5ae60baf715ca)
3. [Historical reference baseline — GitHub](https://github.com/ibrahim0908780850-code/salih-ai/commit/170dfa2de454b98afd4675e599cb16e8ec821aee)
