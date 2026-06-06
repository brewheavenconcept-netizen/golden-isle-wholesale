<USER_REQUEST>
Untuk task *coding* yang perlukan ketepatan (precision) macam potong dan ganti blok kod spesifik tanpa rosakkan logic sedia ada ni, model yang paling ngam untuk ko pilih dalam Antigravity IDE tu adalah **Gemini 3.1 Pro (High)**. Model ni memang *specialized* untuk *complex reasoning* dan *surgical code refactoring*.

Ko *copy* bulat-bulat *prompt* kat bawah ni, letak dalam kotak *chat* AGY, dan terus *run*:

```text
Refactor `app/api/chat/route.ts` to optimize the Golden AI persona, reduce token usage, and remove the rigid OFF_TOPIC hardcoding. Perform these exact 3 modifications carefully:

1. Replace the entire `languageInstruction` block and the initial `systemInstructionText` definition (around lines 159-198) with this precise code:

```typescript
        let languageInstruction = "";
        if (language === "en") {
            languageInstruction = `## LANGUAGE & TONE\n- Use casual, conversational English. Speak like a helpful local friend, not a rigid corporate consultant.`;
        } else if (language === "zh") {
            languageInstruction = `## LANGUAGE & TONE\n- Use natural, conversational Mandarin (Chinese). Friendly, warm, and direct.`;
        } else {
            // Default: ms
            languageInstruction = `## LANGUAGE & TONE\n- Gunakan bahasa Melayu santai. Boleh campur sikit slang Sabah (contoh: "bos", "ngam"). Speak like a helpful local friend.\n- Jangan terlalu skema. Elakkan ayat korporat.`;
        }
        
        // Build context block from customer session (injected by ChatWidget)
        const contextBlock = customerContext ? buildContextBlock(customerContext) : "";

        let systemInstructionText = `ROLE:
You are Golden AI, a lightning-fast, exclusive, and friendly concierge for Golden Isle Wholesale (a premium duty-free liquor supplier). 

CRITICAL CONSTRAINTS (VIOLATION IS STRICTLY FORBIDDEN):
1. LENGTH STRICT LIMIT: Maximum 3 short sentences per reply. Keep it extremely punchy and scannable.
2. NO FORMATTING: Strictly NO bullet 
<truncated 339 bytes>
m back to your premium beverages. Never apologize like a robot.

${languageInstruction}

${contextBlock}
`;

```

2. Locate the `if (flowType === "ask_question")` block. Remove the 3rd rule regarding the "OFF_TOPIC" sentinel word. Update the block to be exactly this:

```typescript
        if (flowType === "ask_question") {
            systemInstructionText += `
CONCIERGE INQUIRY RULES:
1. Provide sophisticated, concise answers about products, shipping, delivery, and payments.
2. Even when answering questions, maintain your identity as a friendly consultant.
`;

```

3. Locate and COMPLETELY DELETE the entire `if (reply && reply.includes("OFF_TOPIC")) { ... }` block (around lines 282-290) that overwrites the reply with a canned refusal message. Let the logic flow directly into the `if (!reply) {` error check.

Do not modify any imports, Supabase logic, or existing API tool calls. Only apply these specific persona and logic changes.

```

```
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-28T23:48:17+08:00.

The user's current state is as follows:
Active Document: c:\Project-mantaps-BEER\Golden-Isle-CMS\app\api\chat\route.ts (LANGUAGE_TYPESCRIPT)
Cursor is on line: 734
Other open documents:
- c:\Project-mantaps-BEER\Golden-Isle-CMS\app\api\chat\route.ts (LANGUAGE_TYPESCRIPT)
- c:\Project-mantaps-BEER\Golden-Isle-CMS\app\api\vision\route.ts (LANGUAGE_TYPESCRIPT)
- c:\Project-mantaps-BEER\Golden-Isle-CMS\components\ChatWidget.tsx (LANGUAGE_TSX)
- c:\Project-mantaps-BEER\Golden-Isle-CMS\docs\chatbot_setup_notes.md (LANGUAGE_MARKDOWN)
Running terminal commands:
- npm run dev (in c:\Project-mantaps-BEER\golden-isle-cms, running for 4h1m25s)
</ADDITIONAL_METADATA>
<USER_SETTINGS_CHANGE>
The user changed setting `Model Selection` from Gemini 3.5 Flash (Medium) to Gemini 3.1 Pro (High). No need to comment on this change if the user doesn't ask about it. If reporting what model you are, please use a human readable name instead of the exact string.
</USER_SETTINGS_CHANGE>