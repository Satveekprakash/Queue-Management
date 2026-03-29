from fastapi import FastAPI
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os
import json

# Load environment variables from .env
load_dotenv()

# Create FastAPI app
app = FastAPI()

# Create Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Input model (this defines what JSON FastAPI expects)
class MessageRequest(BaseModel):
    message: str

# Simple test route
@app.get("/")
def home():
    return {"message": "FastAPI + Groq is working"}

# System prompt for intent classification
SYSTEM_PROMPT = """
You are an AI assistant for a clinic queue system.

Your ONLY job is to classify the user's message into ONE of these intents:

CHECK_TOKEN
CHECK_PATIENTS_AHEAD
CHECK_WAIT_TIME
CHECK_CLINIC_TIMING
MOTIVATION
THANKS
HELP
OUT_OF_SCOPE

IMPORTANT:
- The user may ask in English, Hindi, Hinglish, or mixed casual language.
- The user may also type with spelling mistakes, short forms, or informal phrasing.
- You must still understand the meaning and classify correctly.
- DO NOT answer the question.
- ONLY classify the message.

Return ONLY valid JSON in this exact format:

{
  "intent": "CHECK_WAIT_TIME",
  "allowed": true
}

Examples:

English:
- "What is my token?" → CHECK_TOKEN
- "How many patients are ahead?" → CHECK_PATIENTS_AHEAD
- "How much time left?" → CHECK_WAIT_TIME
- "What is clinic timing?" → CHECK_CLINIC_TIMING
- "I am nervous" → MOTIVATION
- "Thank you" → THANKS
- "Help" → HELP

Hindi / Hinglish:
- "Mera token kya hai?" → CHECK_TOKEN
- "Mere aage kitne patient hai?" → CHECK_PATIENTS_AHEAD
- "Kitna time lagega?" → CHECK_WAIT_TIME
- "Mera number kab aayega?" → CHECK_WAIT_TIME
- "Clinic kitne baje khulta hai?" → CHECK_CLINIC_TIMING
- "Main nervous hoon" → MOTIVATION
- "Dhanyavaad" / "Thanks bhai" → THANKS
- "Madad chahiye" → HELP

If the message is not related to queue, token, waiting time, clinic timing, help, or simple patient support, return:
{
  "intent": "OUT_OF_SCOPE",
  "allowed": false
}
"""


# Main API route
@app.post("/classify")
def classify_message(req: MessageRequest):
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": req.message}
            ],
            temperature=0
        )

        content = response.choices[0].message.content.strip()

        try:
            result = json.loads(content)
        except:
            result = {
                "intent": "OUT_OF_SCOPE",
                "allowed": False
            }

        return result

    except Exception as e:
        return {
            "intent": "OUT_OF_SCOPE",
            "allowed": False,
            "error": "Try next time..."
        }
            