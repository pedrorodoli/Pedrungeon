import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del cliente
app.use(express.static(path.join(__dirname, 'client/dist')));

// Nueva inicialización según SDK v1 (como en ReplitBot)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// El modelo especificado por el usuario
const MODEL_NAME = "gemini-2.0-flash-lite";

const SYSTEM_PROMPT = `
Eres el Game Master de un juego de rol de texto llamado "Dragones&Pedrulos".
Tu objetivo es narrar una historia interactiva inmersiva.

REGLAS DE JUEGO Y BALANCE (MUY IMPORTANTE):
1. **BALANCE DE DIFICULTAD:** NO seas injustamente castigador. 
   - Si el jugador toma una buena decisión o tiene un plan lógico, DEBE tener éxito sin perder vida.
   - El daño (pérdida de HP) solo ocurre por fallos, malas decisiones, o enemigos muy poderosos.
   - No conviertas cada interacción en un combate a muerte. Permite sigilo, diplomacia y exploración.
2. **RITMO:** Intercala momentos de tensión con momentos de calma y descripción. No todo es hostil.
3. **VIDA:** El jugador empieza con 100 HP. Si llega a 0, MUERE.
4. **FORMATO:** Devuelve SIEMPRE un JSON válido.

FORMATO DE RESPUESTA JSON:
{
  "narrative": "Texto de la historia...",
  "hp_change": 0, // Negativo=Daño, Positivo=Curación. Pon 0 si no hubo daño.
  "is_dead": false,
  "atmosphere": "neutral", // 'neutral', 'danger', 'safe', 'mystery', 'triumph'
  "inventory_updates": [], // Ej: ["+Llave", "-Poción"]
  "choices": [
    { "text": "Opción A", "id": "a" },
    { "text": "Opción B", "id": "b" },
    { "text": "Opción C", "id": "c" }
  ]
}

RESPONDE SIEMPRE EN ESPAÑOL.
`;

app.post('/api/start', async (req, res) => {
    try {
        const { setting } = req.body;
        
        let promptText = "";
        if (!setting || setting === 'random') {
            promptText = "Inicia una aventura en un escenario TOTALMENTE ALEATORIO y sorpresivo. Elige tú el género y el tono. Pon al jugador en situación inmediatamente.";
        } else {
            promptText = `Inicia una aventura ambientada en: ${setting}. Crea una introducción inmersiva adecuada a este género. Pon al jugador en situación.`;
        }

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            config: {
                systemInstruction: SYSTEM_PROMPT,
                responseModalities: [Modality.TEXT],
                responseMimeType: 'application/json',
                temperature: 0.9 // Creatividad alta pero controlada
            }
        });
        
        let jsonStr = response.text;
        if (!jsonStr) throw new Error("Respuesta vacía de Gemini");

        jsonStr = jsonStr.replace(/```json|```/g, '').trim();
        res.json(JSON.parse(jsonStr));
    } catch (error) {
        console.error("Error en start:", error);
        res.status(500).json({ error: "El Oráculo duerme (Error Gemini)" });
    }
});

app.post('/api/action', async (req, res) => {
    const { history, action, currentStats } = req.body;

    try {
        const context = `
        ESTADO ACTUAL DEL JUGADOR:
        Vida: ${currentStats.hp}/100
        Inventario: ${currentStats.inventory.join(', ')}
        
        HISTORIA RECIENTE (Resumen):
        ${history.slice(-3).join('\n')}
        
        ACCIÓN DEL JUGADOR:
        "${action}"
        
        Genera la consecuencia narrativamente y actualiza el estado.
        `;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: 'user', parts: [{ text: context }] }],
            config: {
                systemInstruction: SYSTEM_PROMPT,
                responseModalities: [Modality.TEXT],
                responseMimeType: 'application/json'
            }
        });

        let jsonStr = response.text;
        if (!jsonStr) throw new Error("Respuesta vacía de Gemini");

        jsonStr = jsonStr.replace(/```json|```/g, '').trim();
        res.json(JSON.parse(jsonStr));

    } catch (error) {
        console.error("Error en action:", error);
        res.status(500).json({ error: "La realidad se fragmenta (Error server)" });
    }
});

// Cualquier otra ruta devuelve el index.html (para React/Vite router)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

const PORT = 3019; // Puerto solicitado por el usuario
app.listen(PORT, () => {
    console.log(`Dragones&Pedrulos Server running on port ${PORT} using model ${MODEL_NAME}`);
});