async function classifyMessage(message) {
  try {
    const response = await fetch("http://127.0.0.1:8001/classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    console.log("[PYTHON AI] Raw response:", response.data);
    return data;
  } catch (error) {
    console.error("Error calling FastAPI:", error.message);

    return {
      intent: "OUT_OF_SCOPE",
      allowed: false
    };
  }
}

module.exports = { classifyMessage };