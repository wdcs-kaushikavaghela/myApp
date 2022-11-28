
var multer = require("multer");
const upload = multer({ dest: 'uploads/' });

// function checkFileType(file, callback) {
//     const fileTypes = /jpeg|jpg|png|pdf|txt|doc|docx/;
//     const extName = fileTypes.test(path.extname(file.originalname).toLocaleLowerCase());
//     console.log(extName)
//     if (extName) {
//         return callback(null, true);
//     } else {
//         callback('Error:Images only!')
//     }
// }

module.exports = {
  upload,
};