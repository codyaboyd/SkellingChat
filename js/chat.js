import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

const LOCAL_MODEL = "onnx-community/SmolLM2-360M-Instruct";
const generationParams = {
  max_new_tokens: 180,
  temperature: 0.7,
  top_p: 0.9,
  do_sample: true,
  repetition_penalty: 1.08,
};

const initialSessionLength = 512;
let sessionLength = initialSessionLength;
let forceStop = false;
let isGenerating = false;
let generator = null;

const SYSTEM_PROMPT = "You are Jack Skellington, the Pumpkin King of Halloween Town. Stay in character, be spooky but helpful, and use light Halloween-themed flair.";

function isWaitingForInputs() {
  return $('.human-replica textarea').length >= 1;
}

function buildPromptFromDialogue() {
  const parts = [
    `System: ${SYSTEM_PROMPT}`,
  ];

  $('.dialogue .human-replica, .dialogue .ai-replica .text').each((_idx, el) => {
    const $el = $(el);
    const content = $el.text().trim();
    if (!content) {
      return;
    }

    if ($el.is('.human-replica')) {
      parts.push(content.replace(/^User:\s*/i, 'User: '));
    } else {
      parts.push(`Assistant: ${content}`);
    }
  });

  parts.push('Assistant:');
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

    // Trim potential role-prefix noise.
    reply = reply
      .replace(/^Assistant:\s*/i, '')
      .split(/\n(?:User|System):/i)[0]
      .trim();

    if (!reply) {
      reply = "The mists are quiet... ask again, and I shall try once more.";
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
    '<p class="human-replica"><textarea class="form-control" id="exampleTextarea" rows="2">User: </textarea></p>'
  ));
  upgradeTextArea();
}

function upgradeTextArea() {
  const textarea = $('.human-replica textarea');
  autosize(textarea);
  textarea[0].selectionStart = textarea[0].value.length;
  textarea.focus();

  textarea.off('keypress').on('keypress', e => {
    if (e.which === 13 && !e.shiftKey) {
      e.preventDefault();
      sendReplica();
    }
  });
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
  upgradeTextArea();

  $('.retry-link').click(e => {
    e.preventDefault();
    retry();
  });

  setInterval(animateLoading, 2000);
});
