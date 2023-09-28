const { default: axios } = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = "6226990795:AAFbLKPSdaYUYoPDHuDwXVXKpaBSQ91CLKc";
const PF_TOKEN = "2ce0641b9efe8c0640f7093b8b08e3cc";
const url = "https://bestdating.planfix.com/rest/task/";

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
});

// Объект для отслеживания состояния пользователя
const userState = {};

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text;

  if (userState[chatId] === "processing" || userState[chatId] === "reasoning") {

  } else {
    // Обрабатываем первый ответ пользователя
    // Отправка данных на сервер
    const send_data = {
      customFieldData: [
        {
          field: {
            id: 40134,
          },
          value: message, // Отправляем сообщение пользователя в поле id: 40134
        },
      ],
    };

    try {
      await axios.post(`${url + splited_data[1]}`, send_data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PF_TOKEN}`,
        },
      });

      // Ваши дополнительные действия после успешной отправки данных на сервер
      // Здесь можно отправить сообщение "Запрос принят в обработку" или что-то еще

      // Устанавливаем состояние "processing" только после успешной отправки
      userState[chatId] = "processing";
    } catch (error) {
      console.error("Ошибка:", error);
    }
  }
});

bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;
  userState[chatId] = null;

  bot
    .editMessageReplyMarkup(
      {
        inline_keyboard: [], // Удаляет клавиатуру
      },
      {
        chat_id: chatId,
        message_id: messageId,
      }
    )
    .catch((error) => {
      console.error("Ошибка:", error);
    });

  splited_data = data.split(":");
  if (splited_data[0] == "set_true") {
    // Обработка согласия
    const send_data = {
      customFieldData: [
        {
          field: {
            id: 40134,
          },
          value: "Согласовано, можем предоставить экспорт",
        },
      ],
    };

    axios
      .post(`${url + splited_data[1]}`, send_data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PF_TOKEN}`,
        },
      })
      .then(() => {
        // Ваши дополнительные действия после успешного согласия
        bot.sendMessage(chatId, "Запрос принят в обработку");
        userState[chatId] = "processing"; // Устанавливаем состояние "processing" после согласия
      })
      .catch((error) => {
        console.error("Ошибка:", error);
      });
  } else if (splited_data[0] == "set_false") {
    if (userState[chatId] === "processing") {
      bot.sendMessage(chatId, "Запрос уже был принят, активных задач нет");
    } else {
      // Обработка отказа
      bot.sendMessage(
        chatId,
        "Укажите, пожалуйста, причину отказа или уточнения для постановщика"
      );

      // Устанавливаем состояние "reasoning" для ожидания ответа пользователя
      userState[chatId] = "reasoning";
    }
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text;

  // Проверяем, находится ли пользователь в состоянии "reasoning"
  if (userState[chatId] === "reasoning") {
    // Пользователь ответил на запрос причины отказа
    const answer = message;

    // Отправляем ответ на отказ и записываем в поле id: 40134
    const send_data = {
      customFieldData: [
        {
          field: {
            id: 40134,
          },
          value: answer,
        },
      ],
    };

    try {
      await axios.post(`${url + splited_data[1]}`, send_data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PF_TOKEN}`,
        },
      });

      // Ваши дополнительные действия после получения ответа на отказ
      bot.sendMessage(chatId, "Запрос принят в обработку");
      userState[chatId] = "processing"; // Устанавливаем состояние "processing" после отказа
    } catch (error) {
      console.error("Ошибка:", error);
    }
  }
});