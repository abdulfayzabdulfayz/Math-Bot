require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);

// 🔹 DB yuklash
let db = JSON.parse(fs.readFileSync('db.json'));

// 🔹 DB saqlash
function saveDB() {
  fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
}

// 🔹 Kanallar
const channels = [
  { name: 'Kanal-1', username: '@oq_toplam_1996_2007_yechimlar' },
  { name: 'Kanal-2', username: '@abituriyent1_10_11_yechimlari' },
  { name: 'Kanal-3', username: '@Matematiklar_academiyasi' }
];

const PRIVATE_GROUP_ID = process.env.PRIVATE_GROUP_ID;

// 🔹 START
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();

  // user qo‘shish
  if (!db.users[userId]) {
    db.users[userId] = {
      gift: false
    };
    saveDB();
  }

  if (db.users[userId].gift) {
    return ctx.reply('⚠️ Siz sovg‘ani allaqachon olgansiz!');
  }

  await ctx.reply(
`👋 Assalomu alaykum!

📚 Matematiklar Akademiyasiga xush kelibsiz!

👇 Avval quyidagi kanallarga obuna bo‘ling`,
    getChannelsKeyboard()
  );
});

// 🔹 Buttonlar
function getChannelsKeyboard(unjoined = null) {
  const list = unjoined || channels;

  return Markup.inlineKeyboard([
    ...list.map(ch => [
      Markup.button.url(ch.name, `https://t.me/${ch.username.replace('@','')}`)
    ]),
    [Markup.button.callback('✅ Tekshirish', 'check')]
  ]);
}

// 🔹 CHECK
bot.action('check', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();

  let unjoined = [];

  for (let ch of channels) {
    try {
      const member = await ctx.telegram.getChatMember(ch.username, userId);
      if (!['member','administrator','creator'].includes(member.status)) {
        unjoined.push(ch);
      }
    } catch {
      unjoined.push(ch);
    }
  }

  // ❌ Obuna emas
  if (unjoined.length > 0) {
    return ctx.reply(
      `Siz quyidagi kanallarga obuna bo'lmadingiz! Iltimos barcha kanallarga azo bo'ling`,
      getChannelsKeyboard(unjoined)
    );
  }

  // 🔐 Referral qo‘shish (faqat shu yerda!)
  const refId = ctx.startPayload;

  if (refId && refId != userId && !db.invitedBy[userId]) {
    db.invitedBy[userId] = refId;

    if (!db.referrals[refId]) db.referrals[refId] = [];
    if (!db.referrals[refId].includes(userId)) {
      db.referrals[refId].push(userId);
    }

    saveDB();
  }

  // 🔗 Referral link
  const botInfo = await bot.telegram.getMe();
  const refLink = `https://t.me/${botInfo.username}?start=${userId}`;

  await ctx.reply(
`🎉 Siz barcha kanallarga obuna bo‘ldingiz!

🎁 Sovg‘ani olish uchun:
👉 3 ta do‘stingizni taklif qiling

🔗 Sizning referal linkingiz:
${refLink}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('📊 Holatni tekshirish', 'status')]
    ])
  );
});

// 🔹 STATUS
bot.action('status', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();

  const count = db.referrals[userId] ? db.referrals[userId].length : 0;

  if (count >= 3 && !db.users[userId].gift) {
    try {
      const link = await ctx.telegram.createChatInviteLink(PRIVATE_GROUP_ID, {
        member_limit: 1
      });

      db.users[userId].gift = true;
      saveDB();

      return ctx.reply(
`🎉 Tabriklaymiz!

Siz 3 ta odam taklif qildingiz ✅

🎁 Sovg‘a havolasi:`,
        Markup.inlineKeyboard([
          [Markup.button.url("Sovg'a havolasi", link.invite_link)]
        ])
      );
    } catch (err) {
      console.log(err);
      return ctx.reply('❌ Bot admin emas yoki ruxsat yo‘q');
    }
  }

  ctx.reply(
`📊 Sizning natijangiz:

👥 Taklif qilganlar: ${count} / 3
👉 Yana ${3 - count} ta odam kerak`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Yangilash', 'status')]
    ])
  );
});

// 🔹 ADMIN
bot.command('admin', (ctx) => {
  if (ctx.from.id != process.env.ADMIN_ID) return;

  ctx.reply(
`📊 Admin Panel
👤 Foydalanuvchilar: ${Object.keys(db.users).length}
🎁 Sovg‘a olganlar: ${
  Object.values(db.users).filter(u => u.gift).length
}`
  );
});

// 🔹 BROADCAST
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

// 🔹 START BOT
bot.launch();
console.log('🚀 Bot ishga tushdi');