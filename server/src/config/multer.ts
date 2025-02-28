import multer from 'multer';
import mime from 'mime-types';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/'); // Папка для сохранения файлов
  },
  filename: function (req, file, cb) {
    if (!req.user) {
      return cb(new Error('Пользователь не аутентифицирован'), '');
    }
    const userId = req.user.id
    const { mimetype } = file;
    let fileExtension = mime.extension(mimetype);
    console.log('mimetype: ', mimetype, 'fileExtension: ', fileExtension)
    cb(null, `${userId}.${fileExtension}`); // Используем id пользователя как имя файла
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