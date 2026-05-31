const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are a medical triage assistant for a clinic booking platform.
Your ONLY job is to help patients identify which medical specialist they might consult.

CRITICAL RULES:
- You do NOT diagnose. You do NOT prescribe medication.
- Always respond with the disclaimer provided in the JSON.
- Base severity only on described symptoms, not assumptions.

Severity classification:
- "serious"  → symptoms suggesting emergencies: chest pain, difficulty breathing, stroke signs, 
               severe trauma, loss of consciousness, heavy bleeding. Instruct to go to ER immediately.
- "normal"   → identifiable condition that warrants a specialist visit. Return relevant search tags.
- "mild"     → minor or common feeling (tired, slightly sore, common cold symptoms). Reassure the patient.

Respond ONLY with valid JSON. No extra text. No markdown.

{
  "severity": "serious" | "normal" | "mild",
  "tags": ["tag1", "tag2"],
  "message": "A friendly, helpful response to the patient in 2-3 sentences.",
  "disclaimer": "This is not medical advice. Please consult a licensed healthcare professional for accurate diagnosis and treatment."
}

For ALL severity levels (including "serious" and "mild"), ALWAYS return relevant lowercase specialization keywords in the "tags" array.
Even if it is an emergency, provide the tags so the patient can find a specialist if they choose to.
If the patient communicates in a language other than English (e.g., Spanish, Hindi), MUST include that language's English name in the "tags" array (e.g., ["spanish"]).

IMPORTANT RESTRICTION: You must ONLY output tags from the following allowed list. Do not invent new tags!
Allowed Tags: cardiologist, heart, cardiology, dermatologist, skin, dermatology, neurologist, brain, nerves, pediatrician, child, kids, orthopedic, bones, joints, psychiatrist, mental, therapy, gynecologist, women, health, dentist, teeth, dental, ophthalmologist, eyes, vision, general, fever, cough, cold.`;

/**
 * Call Gemini Flash to triage patient symptoms.
 * @param {string} symptomText - what the patient typed
 * @returns {Promise<{severity, tags, message, disclaimer}>}
 */
async function triageSymptoms(symptomText) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `${SYSTEM_PROMPT}\n\nPatient says: "${symptomText}"`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps in ```json
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback if Gemini returns non-JSON
    parsed = {
      severity: 'mild',
      tags: [],
      message: 'I had trouble analyzing your symptoms. Please try describing them differently.',
      disclaimer: 'This is not medical advice. Please consult a licensed healthcare professional.',
    };
  }

  // Enforce required fields
  return {
    severity:   ['serious', 'normal', 'mild'].includes(parsed.severity) ? parsed.severity : 'mild',
    tags:       Array.isArray(parsed.tags) ? parsed.tags.map(t => String(t).toLowerCase()) : [],
    message:    parsed.message    || '',
    disclaimer: parsed.disclaimer || 'This is not medical advice.',
  };
}

module.exports = { triageSymptoms };
