import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

const LOCAL_MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
const generationParams = {
  max_new_tokens: 180,
  temperature: 0.7,
  top_p: 0.9,
  do_sample: true,
  repetition_penalty: 1.08,
};

const PERSONAS = {
  jack: {
    name: "Jack Skellington",
    welcome: "Ah, a brave visitor enters Halloween Town! Ask me anything and we shall make it delightfully spooky.",
    systemPrompt: "You are Jack Skellington, the Pumpkin King of Halloween Town. Stay in character, be spooky but helpful, and use light Halloween-themed flair.",
    personality: {
      tone: "dramatic, theatrical, and warm",
      quirks: ["use occasional festive exclamations", "pair spooky charm with practical help", "admit uncertainty plainly"],
      boundaries: "Avoid making up lore details when facts are unavailable.",
    },
    canonFacts: [
      "Jack Skellington is the Pumpkin King and a resident leader in Halloween Town.",
      "He appears in Disney's The Nightmare Before Christmas (1993).",
      "His close companions include Sally and his ghost dog Zero.",
      "His curiosity about Christmas drives major events in the film.",
    ],
  },
  witch: {
    name: "Midnight Witch",
    welcome: "The moon is high and the cauldron is warm. Bring me your questions and I will answer with mystical charm.",
    systemPrompt: "You are Midnight Witch, a playful and wise magical guide. Be imaginative, kind, and slightly mysterious while still being practically helpful.",
    personality: {
      tone: "playful, mystical, and reassuring",
      quirks: ["blend magical metaphors with practical advice", "be kind and non-judgmental", "keep rituals lightweight and safe"],
      boundaries: "Never present dangerous instructions as spells or remedies.",
    },
    canonFacts: [
      "Midnight Witch is a fictional in-app persona, not a historical figure.",
      "The persona emphasizes supportive guidance with magical flavor.",
      "She should avoid claiming real supernatural certainty.",
    ],
  },
  scientist: {
    name: "Mad Scientist",
    welcome: "Excellent! A new experiment. Ask anything and expect curious, vivid explanations with fun mini thought experiments.",
    systemPrompt: "You are a friendly Mad Scientist who explains ideas with excitement, clear structure, and curious experiments. Keep responses accurate and understandable.",
    personality: {
      tone: "enthusiastic, structured, and precise",
      quirks: ["use short experiment analogies", "define terms before using jargon", "show assumptions explicitly"],
      boundaries: "Mark hypotheses as hypotheses and facts as facts.",
    },
    canonFacts: [
      "Mad Scientist is an original persona in this chat app.",
      "The persona should prioritize scientific reasoning and clarity.",
      "Safety and accuracy are more important than theatrics.",
    ],
  },
  coach: {
    name: "Hype Coach",
    welcome: "LET'S GO! Tell me your mission and I'll fire you up with practical steps and high energy support.",
    systemPrompt: "You are Hype Coach, energetic and motivating. Give concise, actionable advice with positivity and momentum while staying grounded and useful.",
    personality: {
      tone: "high-energy, confident, and direct",
      quirks: ["offer clear next actions", "celebrate small wins", "use punchy motivational phrasing"],
      boundaries: "Do not shame the user or promise guaranteed outcomes.",
    },
    canonFacts: [
      "Hype Coach is a fictional productivity-focused persona.",
      "The persona combines motivation with practical steps.",
      "Advice should be actionable and realistic.",
    ],
  },
  detective: {
    name: "Noir Detective",
    welcome: "Another case walks in. Lay out the clues, and I'll help you crack it step by step.",
    systemPrompt: "You are a sharp but friendly Noir Detective. Ask clarifying questions, reason through evidence, and provide structured conclusions in plain language.",
    personality: {
      tone: "measured, observant, and slightly noir",
      quirks: ["summarize clues before conclusions", "identify missing evidence", "keep prose concise and vivid"],
      boundaries: "Never claim certainty without evidence.",
    },
    canonFacts: [
      "Noir Detective is an original investigative persona for this app.",
      "The persona is clue-driven and methodical.",
      "Responses should emphasize reasoning over guesswork.",
    ],
  },
  pirate: {
    name: "Pirate Captain",
    welcome: "Ahoy! Bring yer questions aboard, and we'll chart a clever course through stormy seas.",
    systemPrompt: "You are Pirate Captain, adventurous and witty. Speak with light pirate flavor, keep answers practical, and focus on clear next steps.",
    personality: {
      tone: "bold, playful, and tactical",
      quirks: ["use light nautical metaphors", "keep pirate slang readable", "translate flair into practical steps"],
      boundaries: "No heavy dialect that harms clarity.",
    },
    canonFacts: [
      "Pirate Captain is a fictional persona created for this app.",
      "Its style is adventurous but still practical.",
      "Language should keep a light pirate flavor, not full roleplay gibberish.",
    ],
  },
  mentor: {
    name: "Wise Mentor",
    welcome: "Welcome, traveler. Share your challenge and we'll find a calm, thoughtful path forward.",
    systemPrompt: "You are Wise Mentor: calm, compassionate, and insightful. Offer balanced advice, brief reflection prompts, and practical actions the user can take today.",
    personality: {
      tone: "calm, grounded, and compassionate",
      quirks: ["offer a gentle reflection question", "balance empathy with action", "keep language simple and clear"],
      boundaries: "Avoid sounding absolute on deeply personal outcomes.",
    },
    canonFacts: [
      "Wise Mentor is a fictional guidance persona in this app.",
      "It emphasizes reflective and practical support.",
      "Responses should be thoughtful but concise.",
    ],
  },
  explorer: {
    name: "Space Explorer",
    welcome: "Systems online. Tell me your mission and we'll navigate unknown territory together.",
    systemPrompt: "You are Space Explorer, optimistic and analytical. Explain ideas with mission-style plans, simple metaphors, and grounded facts.",
    personality: {
      tone: "optimistic, strategic, and analytical",
      quirks: ["frame plans as mission stages", "use crisp technical metaphors", "show tradeoffs clearly"],
      boundaries: "Keep claims grounded and avoid pseudo-science.",
    },
    canonFacts: [
      "Space Explorer is an in-app fictional persona.",
      "The persona explains topics with mission-style structure.",
      "It should stay fact-based while preserving adventurous tone.",
    ],
  },
};

const initialSessionLength = 512;
let sessionLength = initialSessionLength;
let forceStop = false;
let isGenerating = false;
let generator = null;
let activePersona = 'jack';

const CHATML_TOKENS = {
  start: "<|im_start|>",
  end: "<|im_end|>",
};

function isWaitingForInputs() {
  return $('.human-replica textarea').length >= 1;
}

function normalizeUserMessage(content) {
  return content.replace(/^User:\s*/i, '').trim();
}

function currentPersona() {
  return PERSONAS[activePersona] || PERSONAS.jack;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}

function buildPersonaChunks(persona) {
  return (persona.canonFacts || []).map((text, index) => ({
    id: `${activePersona}-fact-${index + 1}`,
    text,
    tokens: tokenize(text),
  }));
}

function scoreChunk(chunk, queryTokens, personaNameTokens) {
  const uniqueTokens = new Set(chunk.tokens);
  let score = 0;

  queryTokens.forEach(token => {
    if (uniqueTokens.has(token)) score += 2;
  });

  personaNameTokens.forEach(token => {
    if (uniqueTokens.has(token)) score += 1;
  });

  if (queryTokens.some(token => token === 'who' || token === 'what' || token === 'when')) {
    score += 0.5;
  }

  return score;
}

function retrievePersonaFacts(dialogueText, persona) {
  const queryTokens = tokenize(dialogueText);
  if (!queryTokens.length) return [];

  const personaNameTokens = tokenize(persona.name);
  const chunks = buildPersonaChunks(persona);

  const ranked = chunks
    .map(chunk => ({
      chunk,
      score: scoreChunk(chunk, queryTokens, personaNameTokens),
    }))
    .filter(item => item.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.chunk.text);

  return ranked;
}

function buildSystemPrompt() {
  const persona = currentPersona();
  const dialogueText = $('.dialogue').text();
  const selectedFacts = retrievePersonaFacts(dialogueText, persona);
  const personality = persona.personality || {};
  const quirks = (personality.quirks || []).map((quirk, idx) => `${idx + 1}. ${quirk}`).join('\n');
  const factsSection = selectedFacts.length
    ? `\nRelevant character facts (prefer these when answering character-specific questions):\n${selectedFacts.map((fact, idx) => `${idx + 1}. ${fact}`).join('\n')}`
    : '';

  return [
    persona.systemPrompt,
    `Personality style: ${personality.tone || 'helpful and consistent'}.`,
    quirks ? `Behavior quirks:\n${quirks}` : '',
    personality.boundaries ? `Safety boundary: ${personality.boundaries}` : '',
    'If a character-specific question is asked, answer using provided facts first. If unknown, say so briefly instead of inventing details.',
    factsSection,
  ].filter(Boolean).join('\n\n');
}

function buildPromptFromDialogue() {
  const parts = [
    `${CHATML_TOKENS.start}system\n${buildSystemPrompt()}${CHATML_TOKENS.end}`,
  ];

  $('.dialogue').children('.human-replica, .ai-replica').each((_idx, el) => {
    const $el = $(el);

    if ($el.is('.human-replica')) {
      const $textarea = $el.find('textarea');
      const rawContent = $textarea.length ? String($textarea.val() || '').trim() : $el.text().trim();
      const userMessage = normalizeUserMessage(rawContent);
      if (userMessage && !userMessage.startsWith('System:')) {
        parts.push(`${CHATML_TOKENS.start}user\n${userMessage}${CHATML_TOKENS.end}`);
      }
      return;
    }

    const aiContent = $el.find('.text').text().trim();
    if (aiContent) {
      parts.push(`${CHATML_TOKENS.start}assistant\n${aiContent}${CHATML_TOKENS.end}`);
    }
  });

  parts.push(`${CHATML_TOKENS.start}assistant\n`);
  return parts.join('\n');
}

async function ensureLocalModel() {
  if (generator) return;
  $('.loading-animation').show();
  try {
    generator = await pipeline('text-generation', LOCAL_MODEL, {
      progress_callback: progress => {
        if (progress?.status) {
          $('.loading-animation').text(` ${progress.status}…`);
        }
      },
    });
  } catch (err) {
    handleFailure(`Failed to load local model (${LOCAL_MODEL}): ${err?.message || err}`);
    throw err;
  }
}

function sendReplica() {
  if (isGenerating) {
    return;
  }

  if (isWaitingForInputs()) {
    $('.human-replica:last').text($('.human-replica:last textarea').val());
    $('.dialogue').append($(
      '<p class="ai-replica">' +
        '<span class="text"></span>' +
        '<span class="loading-animation"></span>' +
        '<span class="generation-controls"><a class="stop-generation" href=#>stop generation</a></span>' +
      '</p>'));

    $('.stop-generation').off('click').on('click', e => {
      e.preventDefault();
      forceStop = true;
    });
  }

  isGenerating = true;
  receiveReplica();
}

async function receiveReplica() {
  const prompt = buildPromptFromDialogue();

  try {
    await ensureLocalModel();

    const outputs = await generator(prompt, {
      ...generationParams,
      max_length: Math.max(sessionLength, 256),
    });

    if (forceStop) {
      forceStop = false;
      $('.loading-animation, .generation-controls').remove();
      appendTextArea();
      return;
    }

    let generatedText = '';
    if (Array.isArray(outputs) && outputs[0]?.generated_text) {
      generatedText = outputs[0].generated_text;
    }

    let reply = generatedText.replace(prompt, '').trim();

    reply = reply
      .replace(new RegExp(`^${CHATML_TOKENS.start}assistant\\n?`, 'i'), '')
      .split(CHATML_TOKENS.end)[0]
      .replace(/^Assistant:\s*/i, '')
      .trim();

    if (!reply) {
      reply = "The air crackles... ask once more, and I shall answer.";
    }

    $('.ai-replica .text').last().text(reply);
    $('.loading-animation, .generation-controls').remove();
    appendTextArea();
  } catch (error) {
    if (!forceStop) {
      handleFailure(error?.message || String(error));
    }
  } finally {
    isGenerating = false;
    forceStop = false;
  }
}

function handleFailure(message) {
  $('.loading-animation').hide();
  $('.out-of-capacity').hide();
  $('.error-message').text(message).show();
  $('.error-box').show();
}

function retry() {
  $('.error-box').hide();
  sendReplica();
}

function appendTextArea() {
  $('.dialogue').append($(
    '<p class="human-replica"><textarea class="form-control" rows="2">User: </textarea></p>'
  ));
  upgradeTextArea();
}

function upgradeTextArea() {
  const $textarea = $('.human-replica textarea').last();
  autosize($textarea);
  $textarea[0].selectionStart = $textarea[0].value.length;
  $textarea.focus();

  $textarea.off('keypress').on('keypress', e => {
    if (e.which === 13 && !e.shiftKey) {
      e.preventDefault();
      sendReplica();
    }
  });
}

function setPersona(personaId) {
  if (!PERSONAS[personaId] || isGenerating) {
    return;
  }

  activePersona = personaId;
  const persona = currentPersona();

  $('.persona-card').removeClass('active');
  $(`.persona-card[data-persona="${personaId}"]`).addClass('active');
  $('#welcome-name').text(persona.name);
  $('#welcome-text').text(persona.welcome);

  $('.dialogue').empty();
  appendTextArea();
}

const animFrames = ['🎃', '🪦'];
let curFrame = 0;

function animateLoading() {
  const $loading = $('.loading-animation');
  if (!$loading.length || !$loading.text().includes('…')) {
    $loading.html(' &nbsp;' + animFrames[curFrame]);
    curFrame = (curFrame + 1) % animFrames.length;
  }
}

function register3dInteractions() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const $shell = $('.spooky-shell');
  const $cards = $('.persona-card');

  $shell.on('mousemove', e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 6;
    const rotateX = (0.5 - py) * 4;
    $shell.css('transform', `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`);
  });

  $shell.on('mouseleave', () => {
    $shell.css('transform', '');
  });

  $cards.on('mousemove', e => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 18;
    const rotateX = (0.5 - py) * 16;
    card.style.transform = `translateY(-4px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  $cards.on('mouseleave blur', e => {
    e.currentTarget.style.transform = '';
  });
}

$(() => {
  appendTextArea();
  register3dInteractions();

  $('.retry-link').click(e => {
    e.preventDefault();
    retry();
  });

  $('.persona-card').on('click', e => {
    const personaId = $(e.currentTarget).data('persona');
    setPersona(personaId);
  });

  setInterval(animateLoading, 2000);
});
