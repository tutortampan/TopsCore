import fs from 'fs';

const adminHtml = fs.readFileSync('admin.html', 'utf8');
const modalClasses = adminHtml.match(/class="[^"]*modal[^"]*"/g) || [];
console.log('Admin HTML modal classes:', Array.from(new Set(modalClasses)));

const crudModalsJs = fs.readFileSync('js/admin/crud-modals.js', 'utf8');
const crudClasses = crudModalsJs.match(/class="[^"]*modal[^"]*"/g) || [];
console.log('CRUD Modals JS classes:', Array.from(new Set(crudClasses)).slice(0, 20));

