import fs from 'fs';
import pdf from 'pdf-parse';

const data = fs.readFileSync('C:/Users/johnr/Downloads/Groove_-SAN-JOSE-DEL-MONTE-BULACANS-WEB-BASED-PERFORMING-ARTS-HUB-WITH-SMART-CHAT-SUPPORT-AND-STUDIO-LOCATOR.docx.pdf');

pdf(data).then(function(d) {
    console.log(d.text);
}).catch(function(err) {
    console.error(err);
});