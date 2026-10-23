// ✅ /api/chatbot.js
export default async function handler(req, res) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || "AIzaSyAMALijTtjygXpYdhntniHZpgeC0g7AqtE";
  const cx = process.env.GOOGLE_SEARCH_CX || "c49882215fd6c4930";

  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: "Missing 'q' parameter." });
  }

  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Google API error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
