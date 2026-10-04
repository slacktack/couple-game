import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('Set ELEVENLABS_API_KEY in your shell to generate these files. The key is never written to disk.');
  process.exit(1);
}

const scripts = JSON.parse(await readFile(new URL('./rule-audio-text.json', import.meta.url), 'utf8'));
const entries = Object.entries(scripts);
const totalCharacters = entries.reduce((sum, [, text]) => sum + text.length, 0);
const hardCharacterLimit = 9_000;
if (totalCharacters > hardCharacterLimit) {
  console.error(`Stopped before making a paid API request: ${totalCharacters} characters exceeds the ${hardCharacterLimit} character free-credit budget.`);
  process.exit(1);
}

// Roger is the voice selected in the ElevenLabs UI when this project was prepared.
const voiceId = 'CwhRBWXzGAHq8TQ4Fs17';
const modelId = 'eleven_turbo_v2_5';
const outputDirectory = resolve('public/audio/rules');
await mkdir(outputDirectory, { recursive: true });

for (const [name, text] of entries) {
  const outputPath = resolve(outputDirectory, `${name}.mp3`);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.58,
        similarity_boost: 0.82,
        style: 0.12,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const message = (await response.text()).slice(0, 500).replaceAll(apiKey, '[redacted]');
    console.error(`ElevenLabs returned HTTP ${response.status} for ${name}: ${message}`);
    process.exit(1);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1_024) {
    console.error(`ElevenLabs returned an unexpectedly small audio file for ${name}; stopping.`);
    process.exit(1);
  }
  await writeFile(outputPath, bytes);
  console.log(`Saved ${name}: ${text.length.toLocaleString()} characters, ${(bytes.length / 1024).toFixed(0)} KB.`);
}

console.log(`Done. ${totalCharacters.toLocaleString()} narration characters sent; no other content was submitted.`);
