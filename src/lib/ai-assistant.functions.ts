import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  symptoms: z.string().min(3).max(2000),
  age: z.string().max(10).optional().default(""),
  gender: z.string().max(30).optional().default(""),
  temperature: z.string().max(20).optional().default(""),
  height: z.string().max(20).optional().default(""),
  weight: z.string().max(20).optional().default(""),
  bloodPressure: z.string().max(30).optional().default(""),
  duration: z.string().max(60).optional().default(""),
  existingDiseases: z.string().max(500).optional().default(""),
  allergies: z.string().max(500).optional().default(""),
});

export const analyzeSymptoms = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const system = `You are HealthCuree AI's health assistant. You analyze patient-reported symptoms and provide structured guidance. You are NOT a doctor and every response must include a clear disclaimer.

Respond in clean markdown with these sections:
### Summary
### Possible Conditions (with brief plain-English notes)
### Recommended Department & Specialist
### Urgency Level (Low / Medium / High / Emergency — bold it)
### Home Care Guidance
### Next Steps (whether to book an appointment or seek emergency care)
### Disclaimer

Be empathetic, clear, and conservative. If symptoms suggest emergency (chest pain with breathlessness, stroke signs, severe bleeding, loss of consciousness, severe allergic reaction), escalate to Emergency urgency and instruct the patient to call the hospital immediately.`;

    const userMsg = `Patient information:
- Symptoms: ${data.symptoms}
- Age: ${data.age || "not provided"}
- Gender: ${data.gender || "not provided"}
- Temperature: ${data.temperature || "not provided"}
- Height: ${data.height || "not provided"}
- Weight: ${data.weight || "not provided"}
- Blood pressure: ${data.bloodPressure || "not provided"}
- Duration of illness: ${data.duration || "not provided"}
- Existing diseases: ${data.existingDiseases || "none reported"}
- Allergies: ${data.allergies || "none reported"}

Analyze and respond in the required markdown structure.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI gateway error", res.status, text);
      if (res.status === 429) throw new Error("Rate limit reached — please wait a moment and try again.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please contact support.");
      throw new Error("AI service is temporarily unavailable.");
    }
    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "No analysis available.";
    return { content };
  });
