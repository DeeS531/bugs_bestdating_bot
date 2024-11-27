const { default: axios } = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = "6226990795:AAFbLKPSdaYUYoPDHuDwXVXKpaBSQ91CLKc"; // основной бот
// const BOT_TOKEN = '5611105328:AAF0HVzZI5aCVQqjI_l81BM98s_EqsK3Np4' //тестовый бот
const PF_TOKEN = "951f9a8633b16d905dd1448cda2ed5cc";
const url = "https://bestdating.planfix.com/rest/task/";

const FormData = require('form-data');
const fs = require('fs');

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

function waitForAnswer(chatId, taskId) {
  return new Promise((resolve, reject) => {
    // Обработчик текстового сообщения
    const textHandler = (msg) => {
      if (msg.chat.id === chatId) {
        bot.removeListener('message', textHandler); // Удаляем обработчик
        bot.removeListener('photo', photoHandler); // Удаляем обработчик фото
        bot.removeListener('document', documentHandler); // Удаляем обработчик документа
        return resolve(msg.text); // Возвращаем текстовый ответ
      }
    };

    // Обработчик фото
    const photoHandler = async (msg) => {
      if (msg.chat.id !== chatId) return;

      try {
        const fileId = msg.photo[msg.photo.length - 1].file_id; // Самое большое фото
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

        console.log('Фото получено. Скачиваю файл...');

        // Скачиваем файл
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const binaryData = response.data;

        console.log('Фото скачано. Загружаю в Planfix...');
        await uploadFileToPlanfix(binaryData, 'photo.jpg', chatId, msg.message_id, taskId);

        bot.removeListener('message', textHandler);
        bot.removeListener('photo', photoHandler);
        bot.removeListener('document', documentHandler);

        console.log('Фото успешно загружено в Planfix');
        resolve('Фото успешно загружено в Planfix');
      } catch (error) {
        console.error('Ошибка при загрузке фото:', error);
        reject(new Error('Ошибка при загрузке фото: ' + error.message));
      }
    };

    // Обработчик документа
    const documentHandler = async (msg) => {
      if (msg.chat.id !== chatId) return;

      try {
        const fileId = msg.document.file_id;
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const fileName = msg.document.file_name;

        console.log('Документ получен. Скачиваю файл...');

        // Скачиваем файл
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const binaryData = response.data;

        console.log('Документ скачан. Загружаю в Planfix...');
        await uploadFileToPlanfix(binaryData, fileName, chatId, msg.message_id, taskId);

        bot.removeListener('message', textHandler);
        bot.removeListener('photo', photoHandler);
        bot.removeListener('document', documentHandler);

        console.log('Документ успешно загружен в Planfix');
        resolve('Файл успешно загружен в Planfix');
      } catch (error) {
        console.error('Ошибка при загрузке документа:', error);
        reject(new Error('Ошибка при загрузке документа: ' + error.message));
      }
    };

    // Регистрируем обработчики
    bot.on('photo', (msg) => {
      console.log("Получено фото: ", msg);
      photoHandler(msg);
      return "К задаче прикреплено фото"

    });
    
    bot.on('document', (msg) => {
      console.log("Получен документ: ", msg);
      documentHandler(msg);
      return "К задаче прикреплён документ"
    });
    
    bot.on('message', (msg) => {
      console.log("Получено текстовое сообщение: ", msg);
      textHandler(msg);
      return msg.text;
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

async function uploadFileToPlanfix(binaryData, filename, chatId, messageId, taskId) {
  const form = new FormData();
  form.append('file', binaryData, filename); // Передаем бинарные данные как файл

  try {
    // Загрузка файла в Planfix
    const uploadResponse = await axios.post('https://bestdating.planfix.com/rest/file/', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${PF_TOKEN}`,
      },
    }).then(resp => {
      console.log(resp);
      if (resp.data.ok==false) {
        throw new Error('Ошибка при загрузке файла в Planfix.'); // Выбрасываем ошибку
      } else {
        console.log('Файл успешно загружен в Planfix:', resp.data.id);
        return resp; // Возвращаем успешный ответ
      }
    });
  
  
    // Присоединение файла к задаче
    await axios.post(`https://bestdating.planfix.com/rest/file/${uploadResponse.data.id}/attach/task?id=${taskId}`, {}, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PF_TOKEN}`,
      },
    }).then(resp => {
      console.log(resp);
      if (resp.data.ok==false) {
        throw new Error('Ошибка при прикреплении файла к задаче.'); // Выбрасываем ошибку
      } else {
        console.log('Файл успешно прикреплен к задаче.');
        return resp; // Возвращаем успешный ответ
      }
    })
    .catch(error => {
      console.error('Ошибка:', error.message);
      // Обработка ошибки
      bot.sendMessage(chatId, 'Ошибка при прикреплении файла. Попробуйте снова.');
    });
  

  
  } catch (error) {
    // Обработка ошибки
    console.error('Ошибка при загрузке или прикреплении файла:', error);
  
    // Удаление сообщения из Telegram
    await bot.deleteMessage(chatId, messageId).catch((err) => {
      console.error('Ошибка при удалении сообщения:', err);
    });
  
    // Отправка уведомления разработчику
    await axios.post('https://api.telegram.org/bot6226990795:AAFbLKPSdaYUYoPDHuDwXVXKpaBSQ91CLKc/sendMessage', {
      chat_id: '983974559',
      text: `Ошибка при загрузке файла в БД: ${error.message}`,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  
    // Сообщение пользователю
    await bot.sendMessage(chatId, 'По какой-то причине файл не был загружен в систему, извините. Разработчику уже сообщил.');
  }
}

// // Пример использования 
// uploadFileToCRM('path/to/your/file.pdf');

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text;   
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
    updateTask(splited_data[1], dataTypeLine(40918,"[Движение между счетами]" ), chatId, "Спасибо! Хорошего дня!");
  }

  if (splited_data[0] === "refill_successfully") {
    // Обновляем задачу в Planfix CRM
    updateTask(splited_data[1], dataTypeStatus(2));
  
    // Отправляем сообщение пользователю, чтобы он приложил ссылку на чек
    bot.sendMessage(chatId, "Пожалуйста приложите ссылку на чек")
      .then(async () => {
        try {
          // Ожидаем, пока пользователь отправит свой ответ (текст или файл)
          const answer = await waitForAnswer(chatId, splited_data[1]);
          updateTask(splited_data[1], dataTypeLine(36772, answer || "Приложен документ"), chatId, "Спасибо! После поступления суммы на счет вы получите фидбек от Финансового Менеджера");
  
        } catch (error) {
          console.error('Ошибка при получении ответа от пользователя:', error);
        }
      })
      .catch(error => {
        console.error('Ошибка при отправке сообщения пользователю:', error);
      });
  }
  

  if(splited_data[0] == "refill_unsuccessfully") {
    bot.sendMessage(chatId,"Укажите причину отказа")
    .then(() => {
      waitForAnswer(chatId)
      .then((answer) => {
        updateTask(splited_data[1], dataTypeLine(40918, `${"[Пополение отклонено] " + answer}`), chatId, "Принял ваш ответ, ожидайте фидбека от Финансового Менеджера");
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
        updateTask(splited_data[1], dataTypeLine(40918, `${"[Актуальная сумма не утверждена] " + answer}`), chatId, "Спасибо, ожадайти фидбека от Финансового Менеджера");
      })
    })
  }
})

