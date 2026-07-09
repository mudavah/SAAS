import type { AiRequestInput } from "@/lib/validations";

const PROMPTS: Record<AiRequestInput["type"], string> = {
  invoice_description:
    "Generate a professional invoice line item description for a Kenyan business. Be concise and clear.",
  email_followup:
    "Write a polite payment follow-up email for a Kenyan freelancer/small business. Keep it warm but professional.",
  social_post:
    "Create a short, engaging social media post for a Kenyan small business. Include relevant hashtags.",
  business_tip:
    "Provide a practical business tip for freelancers and solopreneurs in Kenya. Be specific and actionable.",
  stock_shortage_prediction:
    "Analyze inventory data and predict potential stock shortages. Provide recommendations for reorder quantities and timing.",
  purchase_recommendation:
    "Based on sales velocity and current stock levels, recommend optimal purchase quantities and suppliers for Kenyan SMEs.",
  expense_anomaly:
    "Identify unusual spending patterns in business expenses. Flag any anomalies and suggest cost-saving opportunities.",
  revenue_forecast:
    "Forecast monthly revenue based on historical data, seasonality, and current trends. Provide confidence intervals.",
  invoice_summary:
    "Summarize outstanding invoices, highlighting overdue amounts, aging, and suggested collection actions.",
  business_insights:
    "Generate comprehensive business insights for a Kenyan SME, including cash flow health, profit margins, and growth opportunities.",
};

export async function generateAiContent(input: AiRequestInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return getFallbackContent(input);
  }

  const systemPrompt = `You are KaziFlow AI, a helpful assistant for Kenyan freelancers and small businesses. 
Write in clear, professional English with occasional Swahili phrases where natural. 
Tone: ${input.tone}. Keep responses concise and actionable.`;

  const userPrompt = `${PROMPTS[input.type]}\n\nContext: ${input.context}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    return getFallbackContent(input);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content ?? getFallbackContent(input);
}

function getFallbackContent(input: AiRequestInput): string {
  const fallbacks: Record<AiRequestInput["type"], string> = {
    invoice_description: `Professional services rendered - ${input.context}`,
    email_followup: `Dear Client,\n\nI hope this message finds you well. I wanted to follow up regarding invoice related to: ${input.context}.\n\nPlease let me know if you have any questions.\n\nBest regards`,
    social_post: `🚀 Growing my business one step at a time! ${input.context} #KenyanBusiness #KaziFlow #Entrepreneur`,
    business_tip: `Tip: Always send invoices within 24 hours of completing work. Prompt invoicing leads to faster payments. Context: ${input.context}`,
    stock_shortage_prediction: `Based on current stock levels and typical sales patterns, consider reviewing items with low stock. Check products near their reorder point and plan purchases accordingly. Context: ${input.context}`,
    purchase_recommendation: `Review your current inventory levels and sales history. For items selling quickly, consider increasing order quantities. Focus on products with high turnover rates. Context: ${input.context}`,
    expense_anomaly: `Review recent expenses for any unusual patterns. Look for duplicate charges, unexpected spikes, or categories that exceed normal budgets. Context: ${input.context}`,
    revenue_forecast: `Based on historical trends, estimate your next month's revenue. Consider seasonal factors typical for Kenyan businesses and adjust for any known upcoming projects. Context: ${input.context}`,
    invoice_summary: `You have outstanding invoices that need attention. Focus on older unpaid invoices first and consider sending polite reminders to clients. Context: ${input.context}`,
    business_insights: `Your business health depends on maintaining positive cash flow, controlling expenses, and growing revenue consistently. Focus on collecting overdue payments and optimizing inventory turnover. Context: ${input.context}`,
  };
  return fallbacks[input.type];
}
