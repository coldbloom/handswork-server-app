import multer from 'multer';
import mime from 'mime-types';
import { UserRepository } from "../entities";

function extractSuffix(filename: string) {
  const start = filename.indexOf('_') + 1; // Находим индекс символа '_' и смещаем на 1
  const end = filename.indexOf('.'); // Находим индекс символа '.'

  return filename.slice(start, end);
}

const getName = async (userId: number, fileExtension: string | false): Promise<string> => {
  const userRepository = new UserRepository();
  const userData = await userRepository.findById(userId);

  let counter = 0; // Начальное значение счетчика
  const oldAvatarPathName = userData?.avatarPath;

  if (oldAvatarPathName) {
    counter = Number(extractSuffix(oldAvatarPathName)) + 1; // Увеличиваем счетчик
  }

  return `${userId}_${counter}.${fileExtension}`; // Формируем имя файла
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/'); // Папка для сохранения файлов
  },
  filename: async function (req, file, cb) {
    if (!req.user) {
      return cb(new Error('Пользователь не аутентифицирован'), '');
    }
    const fileExtension = mime.extension(file.mimetype);

    try {
      const fileName = await getName(req.user.id, fileExtension);
      cb(null, fileName);
    } catch (error) {
      console.error('Ошибка генерации имени файла:', error);
      cb(new Error('Не удалось сгенерировать имя файла'), '');
    }
  },
});

// Создаем экземпляр multer с настройками
export const upload = multer({ storage });

// Configure multer to use memory storage
//const storage = multer.memoryStorage();
// Create an upload instance and configure it to use the storage
//const upload = multer({ storage });
// export { storage, upload };

// Настройка хранилища для multer