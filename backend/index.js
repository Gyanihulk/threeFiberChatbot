import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import OpenAI from "openai";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-", // Your OpenAI API key here, I used "-" to avoid errors when the key is not set but you should not do that
});

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "pNInz6obpgDQGcFmaJgB";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`);
        console.error(stderr);
        reject(error);
      } else {
        console.log(stdout);
        resolve();
      }
    });
  });
}

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();

  console.log(`Starting conversion for message ${message}`);

  // Convert audio to WAV format
  await execCommand(
    `ffmpeg -y -i audios\\message_${message}.mp3 audios\\message_${message}.wav`
  );

  console.log(`Conversion done in ${new Date().getTime() - time}ms`);

  // Run rhubarb with the provided arguments
  await execCommand(
    `.\\bin\\rhubarb.exe -f json -o audios\\message_${message}.json audios\\message_${message}.wav -r phonetic`
  );

  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Hey dear... How was your day?",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }
  if (!elevenLabsApiKey || openai.apiKey === "-") {
    res.send({
      messages: [
        {
          text: "Please my dear, don't forget to add your API keys!",
          audio: await audioFileToBase64("audios/api_0.wav"),
          lipsync: await readJsonTranscript("audios/api_0.json"),
          facialExpression: "angry",
          animation: "Angry",
        },
        {
          text: "You don't want to ruin Gyani hulk with a crazy ChatGPT and ElevenLabs bill, right?",
          audio: await audioFileToBase64("audios/api_1.wav"),
          lipsync: await readJsonTranscript("audios/api_1.json"),
          facialExpression: "smile",
          animation: "Laughing",
        },
      ],
    });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    max_tokens: 1000,
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: `
        You are a Gyani hulk a developer and calisthenics athlete.
         
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
        The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry. 
        text should be lower case without any symbols so it is easy to use them
        Always give the response in this format so I can parse it in the code 
        You will always reply with a JSON array of messages. With a maximum of 3 messages.   
        '[{\n' +
    '  "text": "hello",\n' +
    '  "facialExpression": "default",\n' +
    '  "animation": "Idle"\n' +
    '}]'
        `,
      },
      {
        role: "user",
        content: userMessage || "Hello",
      },
    ],
  });
  console.log(completion);
  console.log(completion.choices[0].message, "before parse");
  let messages;
  if (completion?.choices[0]?.message?.content) {
    messages = JSON.parse(completion?.choices[0]?.message?.content);
  }
  console.log(messages, "message");
  if (messages?.messages) {
    messages = messages.messages; // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
  }
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    // generate audio file
    const fileName = `audios/message_${i}.mp3`; // The name of your audio file
    const textInput = message.text; // The text you wish to convert to speech
    try {
      await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
    } catch (err) {
      console.log(err);
    }
    // generate lipsync
    await lipSyncMessage(i);
    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

  res.send({ messages });
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`Virtual GyaniHUlk listening on port ${port}`);
});
