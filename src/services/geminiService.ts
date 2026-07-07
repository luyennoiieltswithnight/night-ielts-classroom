import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const SHORT_TIMEOUT = 15000; // 15 seconds

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
    )
  ]);
}

export async function extractVocabulary(input: string | { data: string, mimeType: string }[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Extract target vocabulary and phrases from the provided content (text or images).
    The vocabulary items are usually marked in a specific way:
    - Bolded English word/phrase
    - Nearby "chưa học" or "not learned" labels (often in red)
    - Nearby Vietnamese meaning
    - Surrounding layout clues

    For each extracted word/phrase, provide:
    1. English word/phrase
    2. IPA pronunciation
    3. Part of speech
    4. Simple English meaning
    5. Natural Vietnamese meaning
    6. Usage context (when to use it, relatable to Vietnamese learners)
    7. 2-4 natural example sentences (simple, useful for speaking, relevant to daily life in Vietnam)

    Also suggest a general topic category for the entire set (e.g., Relationship, Environment, Education, Work, Health, Travel, Daily Life, Technology, Crime, Culture).

    Return the result in JSON format.
  `;

  const contents = typeof input === 'string' 
    ? [{ parts: [{ text: prompt }, { text: input }] }]
    : [{ parts: [{ text: prompt }, ...input.map(img => ({ inlineData: img }))] }];

  const response = await withTimeout(ai.models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                english: { type: Type.STRING },
                ipa: { type: Type.STRING },
                partOfSpeech: { type: Type.STRING },
                simpleEnglishMeaning: { type: Type.STRING },
                vietnamese: { type: Type.STRING },
                usageContext: { type: Type.STRING },
                examples: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["english", "ipa", "partOfSpeech", "simpleEnglishMeaning", "vietnamese", "usageContext", "examples"]
            }
          },
          suggestedTopic: { type: Type.STRING }
        },
        required: ["vocabulary", "suggestedTopic"]
      }
    }
  }), DEFAULT_TIMEOUT);

  return JSON.parse(response.text);
}

export async function generateAudio(text: string) {
  try {
    const response = await withTimeout(ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    }), SHORT_TIMEOUT);

    const base64Pcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Pcm) {
      // Decode and wrap PCM in a WAV header for browser compatibility
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const buffer = new ArrayBuffer(44 + len);
      const view = new DataView(buffer);
      const sampleRate = 24000;

      // RIFF header
      view.setUint32(0, 0x52494646, false); // "RIFF"
      view.setUint32(4, 36 + len, true); // chunkSize
      view.setUint32(8, 0x57415645, false); // "WAVE"

      // FMT subchunk
      view.setUint32(12, 0x666d7420, false); // "fmt "
      view.setUint32(16, 16, true); // subchunk1Size (16 for PCM)
      view.setUint16(20, 1, true); // audioFormat (1 for PCM)
      view.setUint16(22, 1, true); // numChannels (1 for Mono)
      view.setUint32(24, sampleRate, true); // sampleRate (24000)
      view.setUint32(28, sampleRate * 2, true); // byteRate (sampleRate * numChannels * bitsPerSample/8)
      view.setUint16(32, 2, true); // blockAlign (numChannels * bitsPerSample/8)
      view.setUint16(34, 16, true); // bitsPerSample (16)

      // Data subchunk
      view.setUint32(36, 0x64617461, false); // "data"
      view.setUint32(40, len, true); // subchunk2Size

      // PCM samples (Little Endian bytes from Gemini)
      for (let i = 0; i < len; i++) {
        view.setUint8(44 + i, binaryString.charCodeAt(i));
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.error("Audio generation failed or timed out:", error);
  }
  return null;
}

export async function processReadingMode(text: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the following English text and break it into chunks for "Reading Mode" highlighting.
    
    Rules for Chunks:
    1. Identify the main subject/topic of the text. Label it as 'subject'.
    2. Identify new key ideas or information introduced. Label them as 'new_info'.
    3. Identify additional supporting concepts. Label them as 'additional_idea'.
    4. Identify linking words or connectors (e.g., however, therefore, because). Label them as 'connector'.
    5. Identify advanced vocabulary or B2-C1 level phrases. Label them as 'advanced_vocab' and provide a brief Vietnamese meaning.
    6. Everything else is 'normal'.
    
    CRITICAL: 
    - Maintain consistency. If a subject or idea is repeated, it MUST have the same type and the same 'colorId' (a unique string like 'id1', 'id2').
    - The chunks must reconstruct the ORIGINAL text exactly when joined. Do not skip any characters, including spaces and punctuation.
    - For each chunk, provide a 'label' (e.g., "Main Subject", "New Information", "Connector", "Advanced Phrase").
    - For each chunk, provide a 'meaning' in Vietnamese if it's not 'normal'.
    
    Rules for Relationships:
    - Identify cross-sentence relationships between chunks.
    - 'repetition': Same subject/topic mentioned again.
    - 'cause_effect': One idea leads to another.
    - 'example': An example of a previous idea.
    - 'support': Supporting details for a previous idea.
    - 'contrast': A contrasting idea (often linked by connectors like 'however').
    - 'addition': Adding more information to a previous idea.
    - Use the 0-based index of the chunks in the 'chunks' array for 'fromIndex' and 'toIndex'.

    Rules for Logic Map:
    - Create a visual reasoning chain (Logic Map) that captures the flow of arguments.
    - Break the paragraph into a sequence of logical steps.
    - Each step should have a unique 'id', a 'label' (e.g., "Main Idea", "Cause", "Problem", "Action", "Result") and 'content' (a short summary of that step).
    - Include 'meaningVi' as a Vietnamese translation/explanation for each step.
    - Use 'connections' (array of IDs) to show how ideas branch or connect.
    - IMPORTANT: Arrows should reflect relationships: Cause -> Effect, Sequence (Earlier -> Later), Expansion (One idea -> Multiple outcomes), or Supporting details.
    - Support branching (one idea splits into two) or cross-connections where logically appropriate.
    - Assign a 'type' to each step: 'main', 'cause', 'problem', 'response', 'action', or 'result'.
    
    Explanation:
    - Provide a concise, structured explanation of the text in both English and Vietnamese.
    - Use bullet points.
    - Highlight key terms with **bold**.
    - Focus on main idea, key points, and important concepts.

    CRITICAL: 
    - The Logic Map and Explanation must be based on the FULL original text. Do not shorten or truncate the source content.
  `;

  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }, { text: text }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chunks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                type: { 
                  type: Type.STRING, 
                  enum: ['subject', 'new_info', 'additional_idea', 'connector', 'advanced_vocab', 'normal'] 
                },
                meaning: { type: Type.STRING, description: "Vietnamese meaning" },
                colorId: { type: Type.STRING, description: "Consistent ID for repeated entities/ideas" },
                label: { type: Type.STRING, description: "User-friendly label" }
              },
              required: ["text", "type"]
            }
          },
          relationships: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fromIndex: { type: Type.INTEGER },
                toIndex: { type: Type.INTEGER },
                type: { 
                  type: Type.STRING, 
                  enum: ['repetition', 'cause_effect', 'example', 'support', 'contrast', 'addition'] 
                },
                label: { type: Type.STRING }
              },
              required: ["fromIndex", "toIndex", "type"]
            }
          },
          logicMap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                content: { type: Type.STRING },
                meaningVi: { type: Type.STRING },
                type: { 
                  type: Type.STRING, 
                  enum: ['main', 'cause', 'problem', 'response', 'action', 'result'] 
                },
                connections: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "label", "content", "type", "meaningVi"]
            }
          },
          explanationEn: { type: Type.STRING },
          explanationVi: { type: Type.STRING }
        },
        required: ["chunks", "relationships", "logicMap", "explanationEn", "explanationVi"]
      }
    }
  }), DEFAULT_TIMEOUT);

  return JSON.parse(response.text);
}

export async function processListeningMode(input: string | { data: string, mimeType: string }[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the following listening script (provided as text or images) and generate a "Listening Mode" study package.
    
    1. Topic Detection: Identify the main topic (e.g., giving directions, travel, health).
    2. Explanation: Provide a concise, structured explanation of the script in both English and Vietnamese. 
       - Use bullet points.
       - Highlight key terms with **bold**.
       - Focus on main idea, key points, and important concepts.
    3. Logic Map: Create a visual reasoning chain (Logic Map) that captures the flow of the script.
       - Use short, scannable phrases for 'content'.
       - Include 'meaningVi' as a Vietnamese translation/explanation for each step.
       - Use 'id' for each step and 'connections' (array of IDs) to show how ideas branch or connect.
       - IMPORTANT: Arrows should reflect relationships: Cause -> Effect, Sequence (Earlier -> Later), Expansion (One idea -> Multiple outcomes), or Supporting details.
       - Support branching (one idea splits into two) or cross-connections where logically appropriate.
    4. Vocabulary: Identify 5-8 topic-specific vocabulary words or phrases with their Vietnamese meanings.
    5. Gap-Fill Exercise: Create a gap-fill exercise based on the FULL script provided. 
       - Replace 8-15 meaningful words (topic-specific, content words, collocations) with placeholders like [blank1], [blank2], etc.
       - Provide the correct answers and helpful hints for each placeholder in both English ('hint') and Vietnamese ('hintVi').
    
    CRITICAL:
    - ALWAYS preserve the FULL original script exactly as provided.
    - Do NOT shorten, summarize, or remove any part of the script.
    - The gap-fill exercise MUST be based on the COMPLETE script, ensuring no missing sentences or silent trimming.
    
    Return a JSON object with:
    - 'topic': string
    - 'explanationEn': string
    - 'explanationVi': string
    - 'logicMap': array of { label, content, type }
    - 'vocabulary': array of { word, meaning }
    - 'gapFill': { text, blanks: array of { id, answer, hint } }
  `;

  const contents = typeof input === 'string' 
    ? [{ parts: [{ text: prompt }, { text: input }] }]
    : [{ parts: [{ text: prompt }, ...input.map(img => ({ inlineData: img }))] }];

  const response = await withTimeout(ai.models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          explanationEn: { type: Type.STRING },
          explanationVi: { type: Type.STRING },
          logicMap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                content: { type: Type.STRING },
                meaningVi: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['main', 'cause', 'problem', 'response', 'action', 'result'] },
                connections: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "label", "content", "type", "meaningVi"]
            }
          },
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                meaning: { type: Type.STRING }
              },
              required: ["word", "meaning"]
            }
          },
          gapFill: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              blanks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    answer: { type: Type.STRING },
                    hint: { type: Type.STRING },
                    hintVi: { type: Type.STRING }
                  },
                  required: ["id", "answer"]
                }
              }
            },
            required: ["text", "blanks"]
          }
        },
        required: ["topic", "explanationEn", "explanationVi", "logicMap", "vocabulary", "gapFill"]
      }
    }
  }), DEFAULT_TIMEOUT);

  return JSON.parse(response.text);
}

export async function evaluateSpeakingAnswer(question: string, answer: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Evaluate the following IELTS Speaking answer for the question: "${question}".
    Answer: "${answer}"
    
    Provide:
    1. Overall Band Score (estimated).
    2. Criterion Scores (Fluency, Lexical, Grammar, Pronunciation) with a score and short feedback for each.
    3. General feedback on strengths and weaknesses.
    
    Return ONLY valid JSON.
  `;

  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallBand: { type: Type.NUMBER },
          criteria: {
            type: Type.OBJECT,
            properties: {
              fluency: { 
                type: Type.OBJECT, 
                properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING } },
                required: ["score", "feedback"]
              },
              lexical: { 
                type: Type.OBJECT, 
                properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING } },
                required: ["score", "feedback"]
              },
              grammar: { 
                type: Type.OBJECT, 
                properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING } },
                required: ["score", "feedback"]
              },
              pronunciation: { 
                type: Type.OBJECT, 
                properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING } },
                required: ["score", "feedback"]
              }
            },
            required: ["fluency", "lexical", "grammar", "pronunciation"]
          },
          generalFeedback: { type: Type.STRING }
        },
        required: ["overallBand", "criteria", "generalFeedback"]
      }
    }
  }), SHORT_TIMEOUT);

  return JSON.parse(response.text);
}

export async function generateRefinedAnswer(question: string, answer: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Generate a refined Band 8-9 version of the following IELTS Speaking answer for the question: "${question}".
    Original Answer: "${answer}"
    
    Rules:
    - Keep the original idea.
    - Natural spoken style (not a textbook).
    - Include discourse markers, collocations, and idiomatic phrases.
    - Include natural redundancy and fillers.
    
    Provide:
    1. The refined answer text (refinedAnswer).
    2. A list of useful phrases with Vietnamese meanings.
    3. An annotated version (annotatedRefinedAnswer) as an array of chunks.
    
    Return ONLY valid JSON.
  `;

  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          refinedAnswer: { type: Type.STRING },
          annotatedRefinedAnswer: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                isHighlighted: { type: Type.BOOLEAN },
                meaning: { type: Type.STRING },
                ipa: { type: Type.STRING }
              },
              required: ["text", "isHighlighted"]
            }
          },
          usefulPhrases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phrase: { type: Type.STRING },
                meaning: { type: Type.STRING }
              },
              required: ["phrase", "meaning"]
            }
          }
        },
        required: ["refinedAnswer", "annotatedRefinedAnswer", "usefulPhrases"]
      }
    }
  }), DEFAULT_TIMEOUT);

  return JSON.parse(response.text);
}

export async function refineSpeakingAnswer(question: string, answer: string) {
  const [evalData, refinedData] = await Promise.all([
    evaluateSpeakingAnswer(question, answer),
    generateRefinedAnswer(question, answer)
  ]);
  return { ...evalData, ...refinedData };
}

export async function generateCoreSuggestions(question: string, part: 'Part 1' | 'Part 2' | 'Part 3') {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Generate an IELTS Speaking "Answer Suggestion" for the following question: "${question}" (IELTS Speaking ${part}).
    
    The result must include:
    1. Idea Workflow / Answer Flow: A clear, practical structure for the answer.
       - The workflow must be specific to ${part}.
       - Part 1: Direct answer -> Reason -> Example/Feeling.
       - Part 2: Opening -> Description -> Details -> Feeling -> Conclusion.
       - Part 3: Opinion -> Explanation -> Comparison/Example -> Broader comment.
       - Provide each step with a short label and a Vietnamese explanation (meaningVi).
    2. Useful Speaking Vocabulary / Phrases:
       - Focus on spoken vibe (natural collocations, idiomatic phrases, discourse markers, fillers).
       - Band 8-9 level.
       - Include Vietnamese meaning for each.
    3. The Sample Answer (sampleAnswer):
       - Natural spoken style, fluent, realistic.
       - Band 8–9 level.
       - Matches the specific style of ${part}.
       - Include discourse markers, natural redundancy, and topic-specific vocabulary.
       - Emotionally engaging and expressive.
    
    Return the result in JSON format.
  `;

  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          workflow: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                meaningVi: { type: Type.STRING }
              },
              required: ["id", "label", "meaningVi"]
            }
          },
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phrase: { type: Type.STRING },
                meaning: { type: Type.STRING }
              },
              required: ["phrase", "meaning"]
            }
          },
          sampleAnswer: { type: Type.STRING }
        },
        required: ["workflow", "vocabulary", "sampleAnswer"]
      }
    }
  }), SHORT_TIMEOUT);

  return JSON.parse(response.text);
}

export async function generateAnnotatedAnswer(sampleAnswer: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Annotate the following IELTS Speaking sample answer for study purposes.
    Answer: "${sampleAnswer}"
    
    Rules:
    - Highlight useful phrases, collocations, and discourse markers.
    - Add Vietnamese meaning and IPA pronunciation for highlighted chunks.
    - The chunks must reconstruct the original answer exactly when joined.
    
    Return the result in JSON format.
  `;

  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          annotatedSampleAnswer: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                isHighlighted: { type: Type.BOOLEAN },
                meaning: { type: Type.STRING },
                ipa: { type: Type.STRING }
              },
              required: ["text", "isHighlighted"]
            }
          }
        },
        required: ["annotatedSampleAnswer"]
      }
    }
  }), DEFAULT_TIMEOUT);

  return JSON.parse(response.text);
}

export async function generateSpeakingSuggestions(question: string, part: 'Part 1' | 'Part 2' | 'Part 3') {
  const coreData = await generateCoreSuggestions(question, part);
  
  try {
    const annotatedData = await generateAnnotatedAnswer(coreData.sampleAnswer);
    return { ...coreData, ...annotatedData };
  } catch (err) {
    console.error("Annotation failed, returning core data only", err);
    return coreData;
  }
}

export async function chunkSentence(sentence: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the following English sentence and divide it into natural grammatical chunks (phrase blocks) for speaking practice.
    For EACH chunk:
    1. Extract the exact English text.
    2. Provide a natural Vietnamese meaning/translation of that chunk.
    3. Provide the IPA phonetic transcription of that chunk.
    
    CRITICAL: 
    - The sequence of chunks must reconstruct the original sentence exactly when joined (with spaces if necessary, or just preserve correct ordering).
    - Provide a phonetic transcription (IPA) for each chunk.
    - Return ONLY valid JSON matching the schema below.
  `;

  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }, { text: sentence }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chunks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The exact English text of this chunk" },
                meaning: { type: Type.STRING, description: "Vietnamese meaning/translation of this chunk" },
                ipa: { type: Type.STRING, description: "IPA phonetic transcription of this chunk" }
              },
              required: ["text", "meaning", "ipa"]
            }
          }
        },
        required: ["chunks"]
      }
    }
  }), SHORT_TIMEOUT);

  return JSON.parse(response.text);
}

export async function transcribeSpeech(base64Audio: string, mimeType: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = "Transcribe the following English speech. Be tolerant of non-native accents and pronunciation. Return ONLY the transcribed text.";

  const response = await ai.models.generateContent({
    model,
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { data: base64Audio, mimeType } }
      ]
    }]
  });

  return response.text?.trim() || "";
}

export async function parseReadingQuestions(rawQuestions: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Organize the following raw English reading questions into a structured, beautiful format for a teaching app.
    
    CRITICAL RULES:
    1. 100% CONTENT RETENTION: You MUST include every single question and all options (A, B, C, D) provided. Do not rephrase, summarize, or skip anything.
    2. GROUPING: Group questions by their type (e.g., Multiple Choice, True/False/Not Given, Gap Fill, Heading Matching).
    3. FORMATTING: Use Markdown to make it look professional.
       - Use ## for Question Type headers.
       - Use **Question X:** for the question text.
       - Use bullet points for options.
       - Ensure clear spacing between questions.
    4. BREAKDOWN: Return an array of blocks, where each block is a logical group of questions or a single long question.
    5. IMPORTANT: Within the 'content' field of each block, ensure there are at least TWO newlines between individual questions (e.g., between Question 31 and Question 32) so they render clearly separated in the UI.
    
    Return the result in JSON format.
  `;

  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }, { text: rawQuestions }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ["title", "content"]
            }
          }
        },
        required: ["blocks"]
      }
    }
  }), 60000);

  return JSON.parse(response.text);
}
