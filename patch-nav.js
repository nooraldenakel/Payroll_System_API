const fs = require('fs');
const path = require('path');

const dir = './public/stitch';
const pages = ['dashboard', 'payroll-periods', 'excel-import', 'employees', 'reports', 'settings'];

const navItems = [
  { icon: 'dashboard', label: 'Dashboard', url: '/stitch/dashboard.html' },
  { icon: 'calendar_month', label: 'Payroll Periods', url: '/stitch/payroll-periods.html' },
  { icon: 'upload_file', label: 'Excel Import', url: '/stitch/excel-import.html' },
  { icon: 'groups', label: 'Employees', url: '/stitch/employees.html' },
  { icon: 'assessment', label: 'Reports', url: '/stitch/reports.html' },
  { icon: 'settings', label: 'Settings', url: '/stitch/settings.html' },
];

pages.forEach(function(page) {
  const filePath = path.join(dir, page + '.html');
  let html = fs.readFileSync(filePath, 'utf8');

  navItems.forEach(function(item) {
    // Find every anchor with href="#" that contains the icon name near the label
    // Build a regex that matches the full anchor tag with this icon and label text
    const re = new RegExp(
      '(href="#")([^>]*>[\\s\\S]{0,200}?' + item.icon + '[\\s\\S]{0,100}?' + item.label + ')',
      'g'
    );
    html = html.replace(re, function(match, hrefAttr, rest) {
      return 'href="' + item.url + '"' + rest;
    });
  });

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Patched: ' + page + '.html');
});
