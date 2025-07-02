require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const http = require('http');

const bot = new Telegraf(process.env.BOT_TOKEN);
const userInputs = new Map();

const styles = {
  knight: {
    label: '🛡️ Knight',
    fontPath: 'fonts/Kereru.ttf',
    fontFamily: 'Kereru',
    imagePath: 'images/knight.png',
    gradient: ['#f4e3c1', '#e2c48f'],
    textColor: '#000000'
  },
  cyberman: {
    label: '🤖 Cyberman',
    fontPath: 'fonts/NewZelekC.ttf',
    fontFamily: 'NewZelekC',
    imagePath: 'images/cyberman.png',
    gradient: ['#091223', '#091223'],
    textColor: '#ffffff'
  }
};

(async () => {
  for (const key in styles) {
    const style = styles[key];
    registerFont(path.join(__dirname, style.fontPath), { family: style.fontFamily });
    style.image = await loadImage(path.join(__dirname, style.imagePath));
  }

  const fontSize = 32;
  const lineHeight = 42;
  const padding = 30;

  function wrapText(text, maxWidth, ctx) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const testLine = line ? line + ' ' + word : word;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth + padding * 2 > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  async function generateImage(text, style) {
    const canvasWidth = style.image.width;
    const measureCanvas = createCanvas(1, 1);
    const measureCtx = measureCanvas.getContext('2d');
    measureCtx.font = `${fontSize}px '${style.fontFamily}'`;

    const wrappedLines = wrapText(text, canvasWidth, measureCtx);
    const textHeight = wrappedLines.length * lineHeight + padding * 2;
    const canvasHeight = style.image.height + textHeight;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, style.gradient[0]);
    gradient.addColorStop(1, style.gradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * canvasWidth, Math.random() * canvasHeight, 1, 1);
    }

    ctx.drawImage(style.image, 0, 0, canvasWidth, style.image.height);

    ctx.font = `${fontSize}px '${style.fontFamily}'`;
    ctx.fillStyle = style.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const startY = style.image.height + padding;
    wrappedLines.forEach((line, i) => {
      ctx.fillText(line, canvasWidth / 2, startY + i * lineHeight);
    });

    return canvas.toBuffer('image/png');
  }

  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    userInputs.set(ctx.from.id, text);
    const buttons = Object.entries(styles).map(([key, style]) =>
      [Markup.button.callback(style.label, `style:${key}`)]
    );
    await ctx.reply('Choose a style:', Markup.inlineKeyboard(buttons));
  });

  bot.action(/style:(.+)/, async (ctx) => {
    const styleKey = ctx.match[1];
    const style = styles[styleKey];
    const text = userInputs.get(ctx.from.id);
    if (!text || !style) return ctx.reply('Something went wrong.');
    const imageBuffer = await generateImage(text, style);
    await ctx.replyWithPhoto({ source: imageBuffer });
  });

  bot.launch();
})();

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running');
}).listen(PORT);
