import sys
import os
from openai import OpenAI

# Point the client to your local LiteLLM proxy
client = OpenAI(
    api_key="sk-litellm-master-key",  # Your master key from the config
    base_url="http://localhost:4000"
)

if len(sys.argv) < 3:
    print("Usage: python ask.py <model_name> \"<your_prompt>\"")
    sys.exit(1)

model_name = sys.argv[1]
user_prompt = sys.argv[2]

print(f"--- Querying Model: {model_name} ---")

try:
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "user", "content": user_prompt}
        ]
    )
    print(response.choices[0].message.content)
except Exception as e:
    print(f"An error occurred: {e}")
