/*
 * 这个代码是试图增加对手机浏览的支持。手机有点不一样。
 * 1. 首先，需要把sutra.html分为移动版和桌面版，这样，可以分别维护。
 * 2. 其次，把html从qldzj目录移动到public目录，这样，每次更新html目录就不用重启了。qldzj静态目录有特殊的缓存。
 * 3. 最后，ai生成代码，当逻辑复杂时，异常也会增加，调试更费劲，起始也需要模块化的过程。
 */

const express = require('express');
const path = require('path');
const useragent = require('express-useragent');

const app = express();
/*
// 1. 先定义缓存控制中间件（在使用前定义）
const setCacheHeaders = (maxAge) => {
    return (req, res, next) => {
        // 对于GET请求设置缓存头
        if (req.method === 'GET') {
            res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
            // 设置过期时间（作为max-age的备份）
            const expires = new Date();
            expires.setSeconds(expires.getSeconds() + maxAge);
            res.setHeader('Expires', expires.toUTCString());
        }
        next();
    };
};
*/
// 解析 User-Agent 请求头
app.use(useragent.express());

// 中间件：打印请求日志
app.use((req, res, next) => {
    //console.log("=== 请求到达 ===");
    console.log("URL:", req.url);
    //console.log("User-Agent:", req.headers['user-agent']);
    console.log("Is Mobile:", req.useragent.isMobile);
    //console.log("Headers:", req.headers);
    next();
});

// 提供静态文件服务 - 静态资源目录 qldzj
app.use('/qldzj', express.static(path.join(__dirname, 'qldzj')));

// 提供静态文件服务 - 公共目录 public，这里可以包含HTML文件和其他公共资源
app.use(express.static(path.join(__dirname, 'public')));


/*
// 提供静态文件服务 - 静态资源目录 qldzj（图片等）
// 图片资源设置较长缓存时间（30天）
app.use('/qldzj', 
//    setCacheHeaders(2592000), // 30天 = 30*24*60*60秒
    express.static(path.join(__dirname, 'qldzj'), {
        // 启用强ETag验证
        etag: true,
        // 启用最后修改时间验证
        lastModified: true
    })
);


// 提供静态文件服务 - 公共目录 public（HTML、CSS、JS等）
// HTML文件设置较短缓存（10分钟），因为可能经常更新
app.use('/public', 
//    setCacheHeaders(600), // 10分钟 = 10*60秒
    express.static(path.join(__dirname, 'public'), {
        etag: true,
        lastModified: true
    })
);
*/


// 为CSS和JS设置中等缓存时间（1天）
//app.use(/.*\.(css|js)$/, setCacheHeaders(86400));



// 根据客户端类型返回不同的页面
app.get('/sutra.html', (req, res) => {
    if (req.useragent.isMobile) { // 如果是移动设备
	console.log("code run into mobile route...")
        res.sendFile(path.join(__dirname, 'public', 'mobile_sutra.html'));
    } else { // 对于桌面端或其他设备
	console.log("code run into desktop route ...")
        res.sendFile(path.join(__dirname, 'public', 'desktop_sutra.html'));
    }
});

// 可选：为其他路径设置默认文档或重定向到 sutra.html
app.use((req, res) => {
    console.log("...end ...")
    console.log(req.url)
    //res.redirect('/sutra.html');
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
