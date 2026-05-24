// app.js

const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const session = require('express-session');

// 创建Express应用
const app = express();
const port = process.env.PORT || 3000;

// 设置Session中间件
app.use(session({
    secret: 'your_secret_key', // 替换为你的私密密钥
    resave: false,
    saveUninitialized: true
}));

// 初始化Passport并设置中间件
app.use(passport.initialize());
app.use(passport.session());

// 使用GitHub策略配置Passport
passport.use(new GitHubStrategy({
        clientID: 'Ov23lieG0HsLrEVPKaXP', // 替换为您的客户端ID
        clientSecret: 'd52a291c936b0f1d3965235e10d8c3674a7e6166', // 替换为您的客户端密钥
        //callbackURL: "http://103.146.53.137:3000/auth/github/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        // 在这里可以保存用户信息到数据库
        return done(null, profile);
    }
));

// 序列化与反序列化用户对象
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    // 这里应该查询数据库以找到对应的用户记录
    done(null, { id });
});

// 定义主页路由
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
	console.log(req.user.username)
	console.log(req.user)
        res.send(`
            <html>
                <head>
                    <title>Home Page</title>
                </head>
                <body>
                    <h1>Welcome ${req.user.id}!</h1>
                    <a href="/logout">Logout</a>
                </body>
            </html>
        `);
    } else {
        res.send(`
            <html>
                <head>
                    <title>Home Page</title>
                </head>
                <body>
                    <h1>Welcome to the Simple Home Page!</h1>
                    <a href="/auth/github">Login with GitHub</a>
                </body>
            </html>
        `);
    }
});

// GitHub认证路由
app.get('/auth/github',
    passport.authenticate('github'));

// GitHub认证回调处理
app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    function(req, res) {
        // 成功认证后，重定向到首页
        res.redirect('/');
    });

// 登出路由
app.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server is running on http://?.?.?.?:${port}`);
});
