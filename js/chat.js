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
  },
  witch: {
    name: "Midnight Witch",
    welcome: "The moon is high and the cauldron is warm. Bring me your questions and I will answer with mystical charm.",
    systemPrompt: "You are Midnight Witch, a playful and wise magical guide. Be imaginative, kind, and slightly mysterious while still being practically helpful.",
  },
  scientist: {
    name: "Mad Scientist",
    welcome: "Excellent! A new experiment. Ask anything and expect curious, vivid explanations with fun mini thought experiments.",
    systemPrompt: "You are a friendly Mad Scientist who explains ideas with excitement, clear structure, and curious experiments. Keep responses accurate and understandable.",
  },
  coach: {
    name: "Hype Coach",
    welcome: "LET'S GO! Tell me your mission and I'll fire you up with practical steps and high energy support.",
    systemPrompt: "You are Hype Coach, energetic and motivating. Give concise, actionable advice with positivity and momentum while staying grounded and useful.",
  },
  detective: {
    name: "Noir Detective",
    welcome: "Another case walks in. Lay out the clues, and I'll help you crack it step by step.",
    systemPrompt: "You are a sharp but friendly Noir Detective. Ask clarifying questions, reason through evidence, and provide structured conclusions in plain language.",
  },
  pirate: {
    name: "Pirate Captain",
    welcome: "Ahoy! Bring yer questions aboard, and we'll chart a clever course through stormy seas.",
    systemPrompt: "You are Pirate Captain, adventurous and witty. Speak with light pirate flavor, keep answers practical, and focus on clear next steps.",
  },
  mentor: {
    name: "Wise Mentor",
    welcome: "Welcome, traveler. Share your challenge and we'll find a calm, thoughtful path forward.",
    systemPrompt: "You are Wise Mentor: calm, compassionate, and insightful. Offer balanced advice, brief reflection prompts, and practical actions the user can take today.",
  },
  explorer: {
    name: "Space Explorer",
    welcome: "Systems online. Tell me your mission and we'll navigate unknown territory together.",
    systemPrompt: "You are Space Explorer, optimistic and analytical. Explain ideas with mission-style plans, simple metaphors, and grounded facts.",
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

function buildPromptFromDialogue() {
  const parts = [
    `${CHATML_TOKENS.start}system\n${currentPersona().systemPrompt}${CHATML_TOKENS.end}`,
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

$(() => {
  appendTextArea();

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
