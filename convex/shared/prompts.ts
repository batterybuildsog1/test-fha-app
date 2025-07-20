export function buildBankratePrompt(stateName: string): string {
  return `Please analyze the content of the webpage at https://www.bankrate.com/insurance/homeowners-insurance/states/

On that page, locate the table showing average homeowners insurance rates by state for $300,000 in dwelling coverage.

Find the row for "${stateName}".

Extract the average annual premium value (a number like 4078).

Confirm the table uses $300,000 dwelling coverage.

Return the data in this exact JSON format:
{"premium": number, "coverage": 300000}

Example:
{"premium": 4078, "coverage": 300000}

If the data cannot be found or confirmed, return:
{"error": "Data not found or mismatched coverage", "premium": null, "coverage": null}

Return JSON only.`;
}

export function buildBankrateLegacyPrompt(stateName: string): string {
  return `Please analyze the content of the webpage at https://www.bankrate.com/insurance/homeowners-insurance/states/

On that page, locate the table showing average homeowners insurance rates by state.

Find the row where the state column is "${stateName}".

Extract the average annual premium from that row.

Return:
{"premium": number}

Example:
{"premium": 4078}

If not found:
{"error":"not found","premium":null}

Return JSON only.`;
}

export function buildZipPrompt(zip: string): string {
  return `Look up ZIP code ${zip} and return the location data in this exact JSON format:
{"state": "TX", "stateCode": "TX", "city": "Austin", "county": "Travis County"}

Return JSON only.`;
}

export function buildHomesteadPrimaryPrompt(stateName: string): string {
  return `Search for official homestead exemption or primary residence property tax discount in ${stateName} as of July 14, 2025.

Return JSON only:
{"type": "percentage" | "dollar" | "none", "value": number, "source": "url or description", "notes": "any nuances, e.g., school taxes only or county variations"}

- Percentage: decimal (0.45 for 45%).
- Dollar: amount (100000).
- None/complex: "none", 0, explain in notes.`;
}

export function buildHomesteadVerifyPrompt(stateName: string): string {
  return `Verify property tax reduction for owner-occupied homes in ${stateName} as of July 14, 2025.

Return JSON only:
{"type": "percentage" | "dollar" | "none", "value": number, "source": "url or description", "notes": "nuances"}`;
}

export function buildFHARatePrompt(): string {
  return `FETCH the page ↓ (do NOT search):
https://www.mortgagenewsdaily.com/mortgage-rates/30-year-fha

After fetch, locate the **"30 Year FHA"** value (it appears right after that label, e.g. "6.28%"). Strip the % sign and return:

{"rate": 6.28}

If you cannot fetch or the figure is missing, respond *only* with:
{"error":"not found","rate":null}

Return JSON *exactly* – no other text.`;
}