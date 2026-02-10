export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key || key.length < 10) {
      console.warn("OPENAI_API_KEY missing: AI disabled, fallback mode enabled");
    }
  }
}
