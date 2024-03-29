const { default: axios } = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = "6226990795:AAFbLKPSdaYUYoPDHuDwXVXKpaBSQ91CLKc";
const PF_TOKEN = "2ce0641b9efe8c0640f7093b8b08e3cc";
const url = "https://bestdating.planfix.com/rest/task/";

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
});

const updateTask = ( task_id, data, chat_id, text) => {
  try{
    axios.post(`${url + task_id}`, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PF_TOKEN}`,
      },
    })
    .then(() => {
      if(!!chat_id){
        bot.sendMessage(chat_id,text);
      }
    })
  }
  catch{
    console.log('Ошибка:', error);
  }
}

const dataTypeStatus = (id) => {
  return {
    "status": {
      "id": id
    }
  }
}

const dataTypeLine = (field_id, value) => {  // вернуть данные для поля типа Line
  return {
    customFieldData: [
      {
        field: {id: field_id},
        value: value,
      },
    ],
  }
}

function waitForAnswer(chatId) {
  return new Promise((resolve, reject) => {
    bot.onText(/[^a-zA-Z]/g, (msg, match) => {
      const messageChatId = msg.chat.id;
      if (messageChatId === chatId) {
        const answer = match.input
        resolve(answer);
      }
    });
  });
}

const checkNumber = async (number, updateFunc, task_id, send_data, field_id, chat_id, text, field_id2) => {
  const num = Number(number);
  if (!num) {
    bot.sendMessage(chat_id, "Пожалуйста указжите сумму только цифрами без букв и символов!")
    .then(async () => {
      await waitForAnswer(chat_id)
      .then(async (answer) => {
       await checkNumber(answer, updateFunc, splited_data[1], send_data, field_id, chat_id, text, field_id2)
      })
    })
  } else {
    await updateTask(task_id, send_data(field_id, num))
    await bot.sendMessage(chat_id, text)
    .then(() => {
      waitForAnswer(chat_id)
      .then((answer) => {
        updateTask(task_id, send_data(field_id2, answer), chat_id, "Спасибо! После поступления суммы на счет вы получите фидбек от Фин. Мендежера")
      })
    })
  }
}

bot.sendMessage(983974559,"Привет, откуда ты знаешь эту булочку?123")

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text;   
  axios.post('https://api.telegram.org/bot5611105328:AAF0HVzZI5aCVQqjI_l81BM98s_EqsK3Np4/sendMessage',{"chat_id":983974559,"text":`Скрипт запущен`});
  
  if (message.indexOf("DrewSkow")>-1){
    bot.sendMessage(chatId,"Привет, откуда ты знаешь эту булочку?")
    .then(() => {
      waitForAnswer(chatId)
      .then(()=>{
        bot.sendMessage(chatId,"Ты, кстати, тоже 100% сладкая булочка)")
      })
    })
  }
});

bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;

  bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId })
  .catch((error) => {
    console.error('Ошибка:', error);
  });

  splited_data = data.split(":");
  if (splited_data[0] == "set_true") {
    updateTask(splited_data[1], dataTypeLine(40134, "Согласовано, можем предоставить экспорт"), chatId, "Запрос принят в обработку")
  }
  
  if (splited_data[0] == "set_false") {
    
    bot.sendMessage(chatId,"Укажите, пожалуйста, причину отказа или уточнения для постановщика")
     .then(() => {
      waitForAnswer(chatId)
      .then((answer) => {
        updateTask(splited_data[1], dataTypeLine(40134, answer), chatId, "Спасибо, мы сообщим постановщику");
      })
    })
  }

  if(splited_data[0] == "accept_statistics"){
    updateTask(splited_data[1], dataTypeLine(40918,"[Со статистикой ознакомился!]" ), chatId, "Спасибо за ответ! Хорошего дня");
  }

  if(splited_data[0] == "refill_successfully"){
    updateTask(splited_data[1], dataTypeStatus(2));

    bot.sendMessage(chatId,"Пожалуйста приложите ссылку на чек")
    .then(() => {
      waitForAnswer(chatId)
      .then((answer) => {
        updateTask(splited_data[1], dataTypeLine(36772, answer), chatId, "Спасибо! После поступления суммы на счет вы получите фидбек от Фин. Мендежера");
      }) 
    })

  }

  if(splited_data[0] == "refill_unsuccessfully") {
    bot.sendMessage(chatId,"Укажите причину отказа")
    .then(() => {
      waitForAnswer(chatId)
      .then((answer) => {
        updateTask(splited_data[1], dataTypeLine(40918, `${"[Пополение отклонено] " + answer}`), chatId, "Принял твой ответ, ожидай фидбека от Фин. Менеджера");
      })
    })
  }

  if(splited_data[0] == "update_successfully") {
    bot.sendMessage(chatId,"Сумма утверждена");
    updateTask(splited_data[1], dataTypeLine(40918, "[Актуальная сумма утверждена]"));
  }

  if(splited_data[0] == "update_unsuccessfully") {
    bot.sendMessage(chatId,"Опишите причину несогласия:")
    .then(() => {
      waitForAnswer(chatId)
      .then((answer) => {
        updateTask(splited_data[1], dataTypeLine(40918, `${"[Актуальная сумма не утверждена] " + answer}`), chatId, "Спасибо, ожадайти фидбека от Фин. Мендежера");
      })
    })
  }
})

