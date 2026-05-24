require('dotenv').config();

// app.js

const express = require('express');
const path = require('path');

// 创建Express应用
const app = express();
const port = process.env.PORT || 3000;

app.use('/qldzj', express.static(path.join(__dirname, 'qldzj'), {
  maxAge: '7d' // 设置缓存时间为7天
}));

// 导入认证模块
require('./auth')(app);

// 导入主页路由模块
require('./routes/home')(app);

// 启动服务器
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
