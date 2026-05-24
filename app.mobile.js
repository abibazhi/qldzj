const express = require('express');
const path = require('path');
const useragent = require('express-useragent');
const fs = require('fs');
const crypto = require('crypto');
const compression = require('compression');
const expressStaticGzip = require('express-static-gzip');

const app = express();

// 启用 gzip 压缩
app.use(compression());

// 解析 User-Agent
app.use(useragent.express());

// 请求日志中间件
app.use((req, res, next) => {
    console.log("URL:", req.url);
    console.log("Is Mobile:", req.useragent.isMobile);
    next();
});
/*
// 静态资源缓存优化
app.use('/qldzj', express.static(path.join(__dirname, 'qldzj'), {
    maxAge: '365d',
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('ETag', crypto.createHash('md5').update(path).digest('hex'));
    }
}));


// 设置静态资源目录，并启用 gzip 压缩
app.use('/qldzj', expressStaticGzip('public', {
    enableBrotli: true, // 启用 brotli 压缩
    orderPreference: ['br', 'gz'] // 优先级：先尝试 brotli，如果没有，则使用 gzip
}));
*/

// 设置静态资源目录，并启用 gzip 压缩，同时设置缓存优化
app.use('/qldzj', expressStaticGzip(path.join(__dirname, 'qldzj'), {
    enableBrotli: true, // 启用 brotli 压缩
    orderPreference: ['gz', 'br'], // 优先级：先尝试 brotli，如果没有，则使用 gzip
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('ETag', crypto.createHash('md5').update(path).digest('hex'));
    }
}));


// 设置静态资源目录，并启用 gzip 压缩，同时设置缓存优化
app.use(expressStaticGzip(path.join(__dirname, 'public'), {
    enableBrotli: true, // 启用 brotli 压缩
    orderPreference: ['br', 'gz'], // 优先级：先尝试 brotli，如果没有，则使用 gzip
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('ETag', crypto.createHash('md5').update(path).digest('hex'));
    }
}));

/*
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '365d',
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('ETag', crypto.createHash('md5').update(path).digest('hex'));
    }
}));
*/

app.get('/mapping.json', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'mapping.json.gz');
    
    // 设置正确的响应头
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // 发送文件
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('发送 mapping.json 失败:', err);
            res.status(404).json({ error: 'Mapping file not found' });
        }
    });
});

app.get('/sutra.html', (req, res) => {
    const filePath = req.useragent.isMobile
        ? path.join(__dirname, 'public', 'mobile_sutra.html')
        : path.join(__dirname, 'public', 'desktop_sutra.html');

    // 使用 sendFile，它会自动设置 Content-Type
    res.header('Cache-Control', 'public, max-age=300');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('File send error:', err);
            res.status(500).send('File not found or error sending file.');
        }
    });
});
/*
// 动态返回 HTML 并设置缓存
app.get('/sutra.html', (req, res) => {
    const filePath = req.useragent.isMobile
        ? path.join(__dirname, 'public', 'mobile_sutra.html')
        : path.join(__dirname, 'public', 'desktop_sutra.html');

    fs.readFile(filePath, (err, data) => {
        if (err) return res.status(500).send(err);

        const hash = crypto.createHash('md5').update(data).digest('hex');
        const etag = `"${hash}"`;

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).send();
        }

        res.header('ETag', etag);
        res.header('Cache-Control', 'public, max-age=300');
        res.send(data);
    });
});
*/
// 默认路由
app.use((req, res) => {
    res.redirect('/sutra.html');
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
