const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../db');

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

// --- Standard Matching with Advanced Filters ---
// This function already includes location, so we just confirm it's correct.
exports.findStandardMatches = async (pool, userId, userType, filters = {}) => {
    const userResult = await pool.query('SELECT skills, requirements FROM users WHERE id = $1', [userId]);
    const { skills, requirements } = userResult.rows[0];
    
    let queryText;
    let queryParams;

    if (userType === 'student') {
        queryText = `SELECT id, name, requirements, location FROM users WHERE user_type = 'employer' AND requirements && $1`;
        queryParams = [skills];
        
        if (filters.location) {
            queryText += ` AND location ILIKE $2`; 
            queryParams.push(`%${filters.location}%`);
        }
    } else {
        queryText = `SELECT id, name, skills, location FROM users WHERE user_type = 'student' AND skills && $1`;
        queryParams = [requirements];

        if (filters.skill) {
            queryText += ` AND skills @> $2`;
            queryParams.push([filters.skill]);
        }
    }

    const matchesResult = await pool.query(queryText, queryParams);
    return matchesResult.rows;
};

// --- AI Matching with Location (Updated) ---
exports.findAiMatches = async (pool, userType, searchDescription) => {
    let candidates;
    let candidateType;

    // 1. Fetch candidates and ENSURE LOCATION IS SELECTED.
    if (userType === 'student') {
        candidateType = 'employer';
        const result = await pool.query("SELECT id, name, requirements, location FROM users WHERE user_type = 'employer'");
        candidates = result.rows;
    } else {
        candidateType = 'student';
        const result = await pool.query("SELECT id, name, skills, location FROM users WHERE user_type = 'student'");
        candidates = result.rows;
    }

    if (candidates.length === 0) return [];

    // 2. Construct the prompt for the AI.
    const candidatesText = candidates.map(c => {
        const list = c.skills || c.requirements || [];
        return `Candidate(id: ${c.id}, name: '${c.name}', location:'${c.location}' details: [${list.join(', ')}])`;
    }).join('\n');

    const prompt = `
        You are an expert HR recruitment AI. Analyze a search description and a list of candidates.
        Search description: "${searchDescription}"
        List of available ${candidateType}s:
        ${candidatesText}
        Return ONLY a valid JSON array of objects. Each object must contain "id", "score", and "justification" and be sure if the score matches perfectly it should show 100%.
    `;

    // 3. Call the AI and process the response.
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiMatches = JSON.parse(jsonText);

        // 4. Combine AI results with candidate data, INCLUDING LOCATION.
        const finalResults = aiMatches.map(aiMatch => {
            const candidate = candidates.find(c => c.id === aiMatch.id);
            return {
                id: aiMatch.id,
                name: candidate ? candidate.name : 'Unknown',
                location: candidate ? candidate.location : null, // Include location
                score: aiMatch.score,
                key_highlight: aiMatch.justification,
            };
        });

        return finalResults.sort((a, b) => b.score - a.score);
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("The AI matching service is currently unavailable.");
    }
};