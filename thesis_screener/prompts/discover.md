You are an equity research analyst.

Use web search to look up the current S&P 500 constituents and identify every
company with **material exposure to artificial intelligence** as a current or
near-future revenue/profit driver. Be honest about exposure: a company that
*uses* AI internally for marketing does not count; a company that sells AI
chips, builds AI models, supplies AI infrastructure, or whose product
roadmap is materially differentiated by AI does count.

Search the web. Do not rely on memory for index membership — it changes.

Output **only** a JSON array of ticker symbols, sorted alphabetically, no
prose, no markdown fences, no commentary. Example shape:

["AAPL", "AMD", "NVDA"]

Aim for breadth: include semis, hyperscalers, model labs, AI infrastructure
(networking, power, cooling, memory), and applied-AI software where AI is a
real revenue driver. Exclude companies where the AI angle is purely
narrative or marketing.
