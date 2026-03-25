require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);

// ================== DB ==================
let db = { users: {}, referrals: {}, invitedBy: {} };

try {
  if (fs.existsSync('db.json')) {
    db = JSON.parse(fs.readFileSync('db.json'));
  } else {
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  }
} catch (e) {
  console.log("❌ DB xatolik, qayta yaratildi");
}

function saveDB() {
  fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
}

// ================== SETTINGS ==================
const channels = [
  { name: 'Kanal-1', username: '@oq_toplam_1996_2007_yechimlar' },
  { name: 'Kanal-2', username: '@Matematiklar_academiyasi' }
];

const PRIVATE_GROUP_ID = process.env.PRIVATE_GROUP_ID;

// ================== START ==================
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const refId = ctx.startPayload;

  // user create
  if (!db.users[userId]) {
    db.users[userId] = {
      gift: false,
      joined: Date.now()
    };
    saveDB();
  }

  // referralni vaqtincha saqlab qo‘yamiz
  if (
    refId &&
    refId !== userId &&
    !db.invitedBy[userId] &&
    db.users[refId]
  ) {
    db.invitedBy[userId] = refId;
    saveDB();
  }

  if (db.users[userId].gift) {
    return ctx.reply('⚠️ Siz sovg‘ani allaqachon olgansiz!');
  }

  await ctx.reply(
`👋 Assalomu alaykum!

📚 Matematiklar Academiyasiga xush kelibsiz!

👇 Avval quyidagi kanallarga obuna bo‘ling`,
    getChannelsKeyboard()
  );
});

// ================== BUTTON ==================
function getChannelsKeyboard(unjoined = null) {
  const list = unjoined || channels;

  return Markup.inlineKeyboard([
    ...list.map(ch => [
      Markup.button.url(ch.name, `https://t.me/${ch.username.replace('@','')}`)
    ]),
    [Markup.button.callback('✅ Tekshirish', 'check')]
  ]);
}

// ================== CHECK ==================
bot.action('check', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();

  let unjoined = [];

  for (let ch of channels) {
    try {
      const member = await ctx.telegram.getChatMember(ch.username, userId);

      if (!['member', 'administrator', 'creator'].includes(member.status)) {
        unjoined.push(ch);
      }
    } catch {
      unjoined.push(ch);
    }
  }

  // ❌ obuna emas
  if (unjoined.length > 0) {
    return ctx.reply(
      `❌ Siz barcha kanallarga obuna bo‘lmadingiz`,
      getChannelsKeyboard(unjoined)
    );
  }

  // ================== REFERRAL CONFIRM ==================
  const refId = db.invitedBy[userId];

  if (refId) {
    if (!db.referrals[refId]) db.referrals[refId] = [];

    if (!db.referrals[refId].includes(userId)) {
      db.referrals[refId].push(userId);
    }

    saveDB();
  }

  // ================== REF LINK ==================
  const botInfo = await bot.telegram.getMe();
  const refLink = `https://t.me/${botInfo.username}?start=${userId}`;

  await ctx.reply(
`🎉 Obuna tasdiqlandi!

🎁 Sovg‘a olish uchun:
👉 3 ta do‘stingizni taklif qiling

🔗 Sizning linkingiz:
${refLink}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('📊 Holat', 'status')]
    ])
  );
});

// ================== STATUS ==================
bot.action('status', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();

  const count = db.referrals[userId]?.length || 0;

  if (count >= 3 && !db.users[userId].gift) {
    try {
      const link = await ctx.telegram.createChatInviteLink(PRIVATE_GROUP_ID, {
        member_limit: 1
      });

      db.users[userId].gift = true;
      saveDB();

      return ctx.reply(
`🎉 Tabriklaymiz!

Siz 3 ta odam taklif qildingiz ✅`,
        Markup.inlineKeyboard([
          [Markup.button.url("🎁 Sovg‘ani olish", link.invite_link)]
        ])
      );
    } catch (err) {
      console.log(err);
      return ctx.reply('❌ Bot admin emas yoki ruxsat yo‘q');
    }
  }

  ctx.reply(
`📊 Natijangiz:

👥 ${count} / 3
⏳ Qoldi: ${3 - count}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Yangilash', 'status')]
    ])
  );
});

// ================== ADMIN ==================
bot.command('admin', (ctx) => {
  if (ctx.from.id != process.env.ADMIN_ID) return;

  ctx.reply(
`📊 Statistika

👤 Users: ${Object.keys(db.users).length}
🎁 Gift olganlar: ${
  Object.values(db.users).filter(u => u.gift).length
}`
  );
});

// ================== BROADCAST ==================
bot.command('broadcast', async (ctx) => {
  if (ctx.from.id != process.env.ADMIN_ID) return;

  const text = ctx.message.text.replace('/broadcast ', '');

  for (let userId in db.users) {
    try {
      await bot.telegram.sendMessage(userId, text);
    } catch {}
  }

  ctx.reply('✅ Yuborildi');
});

// ================== ERROR ==================
bot.catch((err) => {
  console.log("❌ Xatolik:", err);
});

// ================== START BOT ==================
bot.launch();
console.log('🚀 Bot ishga tushdi');
